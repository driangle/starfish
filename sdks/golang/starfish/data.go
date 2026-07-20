package starfish

import (
	"context"
	"encoding/json"
	"time"
)

// DataScope defines the visibility scope of a data key.
type DataScope string

const (
	ScopeSelf    DataScope = "self"
	ScopeSession DataScope = "session"
)

// DataOp defines the operation to perform on a data key.
type DataOp string

const (
	OpReplace    DataOp = "replace"
	OpMerge      DataOp = "merge"
	OpSetAdd     DataOp = "set.add"
	OpSetRemove  DataOp = "set.remove"
	OpListAdd    DataOp = "list.add"
	OpListRemove DataOp = "list.remove"
	OpCounterAdd DataOp = "counter.add"
	OpDelete     DataOp = "delete"
)

// SaveOptions configures a data.save request.
type SaveOptions struct {
	Key             string
	Scope           DataScope
	Op              DataOp
	Data            any
	ExpectedVersion *int
}

// GetOptions configures a data.get request.
type GetOptions struct {
	Key   string
	Scope DataScope
}

// DataResult is the response from a data operation.
type DataResult struct {
	Key     string
	Scope   DataScope
	Data    any
	Version int
	Op      DataOp    // only set in change notifications
	From    string    // only set in change notifications
}

// dataManager handles shared data operations.
type dataManager struct {
	conn    *connection
	idg     *IDGenerator
	session func() string
}

func newDataManager(conn *connection, idg *IDGenerator, session func() string) *dataManager {
	return &dataManager{
		conn:    conn,
		idg:     idg,
		session: session,
	}
}

// save writes a value to the shared data store.
func (d *dataManager) save(ctx context.Context, opts *SaveOptions) (*DataResult, error) {
	// Validate data size for replace/merge operations
	if opts.Data != nil {
		data, err := json.Marshal(opts.Data)
		if err != nil {
			return nil, err
		}
		if err := ValidatePayloadSize(data, MaxDataValueSize, "data value"); err != nil {
			return nil, err
		}
	}

	ts := time.Now().UnixMilli()
	payload := map[string]any{
		"key":   opts.Key,
		"scope": string(opts.Scope),
		"op":    string(opts.Op),
	}
	if opts.Data != nil {
		payload["data"] = opts.Data
	}
	if opts.ExpectedVersion != nil {
		payload["expectedVersion"] = *opts.ExpectedVersion
	}

	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       d.idg.Next("data"),
			Resource: "data",
			Method:   "save",
			Kind:     "request",
			Session:  d.session(),
			Ts:       &ts,
		},
		Payload: payload,
	}

	reply, err := d.conn.sendAndWait(ctx, frame, 0)
	if err != nil {
		return nil, err
	}

	return parseDataResult(reply.Payload), nil
}

// get reads a value from the shared data store.
func (d *dataManager) get(ctx context.Context, opts *GetOptions) (*DataResult, error) {
	ts := time.Now().UnixMilli()
	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       d.idg.Next("data"),
			Resource: "data",
			Method:   "get",
			Kind:     "request",
			Session:  d.session(),
			Ts:       &ts,
		},
		Payload: map[string]any{
			"key":   opts.Key,
			"scope": string(opts.Scope),
		},
	}

	reply, err := d.conn.sendAndWait(ctx, frame, 0)
	if err != nil {
		return nil, err
	}

	return parseDataResult(reply.Payload), nil
}

func parseDataResult(payload map[string]any) *DataResult {
	if payload == nil {
		return &DataResult{}
	}
	r := &DataResult{}
	if v, ok := payload["key"].(string); ok {
		r.Key = v
	}
	if v, ok := payload["scope"].(string); ok {
		r.Scope = DataScope(v)
	}
	if v, ok := payload["version"].(float64); ok {
		r.Version = int(v)
	}
	if v, ok := payload["op"].(string); ok {
		r.Op = DataOp(v)
	}
	if v, ok := payload["updatedBy"].(string); ok {
		r.From = v
	}
	r.Data = payload["data"]
	return r
}
