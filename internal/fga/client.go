package fga

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client wraps the OpenFGA REST API for authorization checks.
type Client struct {
	endpoint string
	storeID  string
	modelID  string
	client   *http.Client
}

// NewClient creates a new OpenFGA client.
func NewClient(endpoint string) *Client {
	return &Client{
		endpoint: endpoint,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SetStoreID sets the store ID.
func (c *Client) SetStoreID(id string) {
	c.storeID = id
}

// SetModelID sets the authorization model ID.
func (c *Client) SetModelID(id string) {
	c.modelID = id
}

// StoreID returns the current store ID.
func (c *Client) StoreID() string {
	return c.storeID
}

// --- Store Management ---

type createStoreRequest struct {
	Name string `json:"name"`
}

type createStoreResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// CreateStore creates a new OpenFGA store.
func (c *Client) CreateStore(ctx context.Context, name string) (string, error) {
	body, _ := json.Marshal(createStoreRequest{Name: name})
	resp, err := c.doRequest(ctx, "POST", "/stores", body)
	if err != nil {
		return "", fmt.Errorf("create store: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("create store: unexpected status %d", resp.StatusCode)
	}

	var result createStoreResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode store response: %w", err)
	}

	c.storeID = result.ID
	return result.ID, nil
}

// --- Authorization Model ---

type writeModelResponse struct {
	AuthorizationModelID string `json:"authorization_model_id"`
}

// WriteAuthorizationModel writes the authorization model JSON to the store.
func (c *Client) WriteAuthorizationModel(ctx context.Context, model map[string]interface{}) (string, error) {
	body, _ := json.Marshal(model)
	resp, err := c.doRequest(ctx, "POST", fmt.Sprintf("/stores/%s/authorization-models", c.storeID), body)
	if err != nil {
		return "", fmt.Errorf("write auth model: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		data, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("write auth model: status %d: %s", resp.StatusCode, string(data))
	}

	var result writeModelResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode model response: %w", err)
	}

	c.modelID = result.AuthorizationModelID
	return result.AuthorizationModelID, nil
}

// --- Relationship Tuples ---

type tupleKey struct {
	User     string `json:"user"`
	Relation string `json:"relation"`
	Object   string `json:"object"`
}

type writeRequest struct {
	Writes struct {
		TupleKeys []tupleKey `json:"tuple_keys"`
	} `json:"writes"`
}

type deleteRequest struct {
	Deletes struct {
		TupleKeys []tupleKey `json:"tuple_keys"`
	} `json:"deletes"`
}

// WriteTuple writes a relationship tuple.
func (c *Client) WriteTuple(ctx context.Context, user, relation, object string) error {
	req := writeRequest{}
	req.Writes.TupleKeys = []tupleKey{{User: user, Relation: relation, Object: object}}

	body, _ := json.Marshal(req)
	resp, err := c.doRequest(ctx, "POST", fmt.Sprintf("/stores/%s/write", c.storeID), body)
	if err != nil {
		return fmt.Errorf("write tuple: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		data, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("write tuple: status %d: %s", resp.StatusCode, string(data))
	}

	return nil
}

// DeleteTuple deletes a relationship tuple.
func (c *Client) DeleteTuple(ctx context.Context, user, relation, object string) error {
	req := deleteRequest{}
	req.Deletes.TupleKeys = []tupleKey{{User: user, Relation: relation, Object: object}}

	body, _ := json.Marshal(req)
	resp, err := c.doRequest(ctx, "POST", fmt.Sprintf("/stores/%s/write", c.storeID), body)
	if err != nil {
		return fmt.Errorf("delete tuple: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		data, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete tuple: status %d: %s", resp.StatusCode, string(data))
	}

	return nil
}

// --- Authorization Check ---

type checkRequest struct {
	TupleKey tupleKey `json:"tuple_key"`
}

type checkResponse struct {
	Allowed bool `json:"allowed"`
}

// Check verifies whether a user has a specific relation to an object.
func (c *Client) Check(ctx context.Context, user, relation, object string) (bool, error) {
	req := checkRequest{
		TupleKey: tupleKey{User: user, Relation: relation, Object: object},
	}

	body, _ := json.Marshal(req)
	resp, err := c.doRequest(ctx, "POST", fmt.Sprintf("/stores/%s/check", c.storeID), body)
	if err != nil {
		return false, fmt.Errorf("check: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		data, _ := io.ReadAll(resp.Body)
		return false, fmt.Errorf("check: status %d: %s", resp.StatusCode, string(data))
	}

	var result checkResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, fmt.Errorf("decode check response: %w", err)
	}

	return result.Allowed, nil
}

// --- HTTP Helper ---

func (c *Client) doRequest(ctx context.Context, method, path string, body []byte) (*http.Response, error) {
	url := c.endpoint + path

	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	return c.client.Do(req)
}
