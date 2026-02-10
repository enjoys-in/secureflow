package fga

import (
	"context"
	"fmt"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/pkg/logger"
)

// Bootstrap creates an OpenFGA store and writes the authorization model.
// If storeID is provided, it reuses that store. Otherwise, creates a new one.
func Bootstrap(ctx context.Context, client *Client, storeID string, log *logger.Logger) error {
	if storeID != "" {
		client.SetStoreID(storeID)
		log.Info("Using existing OpenFGA store", "store_id", storeID)
	} else {
		id, err := client.CreateStore(ctx, "firewall-manager")
		if err != nil {
			return fmt.Errorf("bootstrap OpenFGA store: %w", err)
		}
		log.Info("Created OpenFGA store", "store_id", id)
	}

	model := BuildAuthorizationModel()
	modelID, err := client.WriteAuthorizationModel(ctx, model)
	if err != nil {
		return fmt.Errorf("bootstrap auth model: %w", err)
	}
	log.Info("Wrote OpenFGA authorization model", "model_id", modelID)

	return nil
}

// AssignRole assigns a role to a user in the system.
func AssignRole(ctx context.Context, client *Client, userID, role string) error {
	user := fmt.Sprintf("user:%s", userID)
	return client.WriteTuple(ctx, user, role, constants.FGAObjectSystem)
}

// RemoveRole removes a role from a user.
func RemoveRole(ctx context.Context, client *Client, userID, role string) error {
	user := fmt.Sprintf("user:%s", userID)
	return client.DeleteTuple(ctx, user, role, constants.FGAObjectSystem)
}

// CheckPermission checks if a user has a specific relation on an object.
func CheckPermission(ctx context.Context, client *Client, userID, relation, object string) (bool, error) {
	user := fmt.Sprintf("user:%s", userID)
	return client.Check(ctx, user, relation, object)
}

// BuildAuthorizationModel returns the OpenFGA authorization model as a JSON-compatible map.
func BuildAuthorizationModel() map[string]interface{} {
	return map[string]interface{}{
		"schema_version": "1.1",
		"type_definitions": []map[string]interface{}{
			{
				"type":      "user",
				"relations": map[string]interface{}{},
			},
			{
				"type": "system",
				"relations": map[string]interface{}{
					"owner": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"admin": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"editor": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"viewer": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"can_admin": map[string]interface{}{
						"union": map[string]interface{}{
							"child": []map[string]interface{}{
								{"computedUserset": map[string]interface{}{"relation": "owner"}},
								{"computedUserset": map[string]interface{}{"relation": "admin"}},
							},
						},
					},
					"can_edit": map[string]interface{}{
						"union": map[string]interface{}{
							"child": []map[string]interface{}{
								{"computedUserset": map[string]interface{}{"relation": "can_admin"}},
								{"computedUserset": map[string]interface{}{"relation": "editor"}},
							},
						},
					},
					"can_view": map[string]interface{}{
						"union": map[string]interface{}{
							"child": []map[string]interface{}{
								{"computedUserset": map[string]interface{}{"relation": "can_edit"}},
								{"computedUserset": map[string]interface{}{"relation": "viewer"}},
							},
						},
					},
				},
				"metadata": map[string]interface{}{
					"relations": map[string]interface{}{
						"owner":  map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
						"admin":  map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
						"editor": map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
						"viewer": map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
					},
				},
			},
			{
				"type": "firewall",
				"relations": map[string]interface{}{
					"owner": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"admin": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"editor": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"viewer": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"can_admin": map[string]interface{}{
						"union": map[string]interface{}{
							"child": []map[string]interface{}{
								{"computedUserset": map[string]interface{}{"relation": "owner"}},
								{"computedUserset": map[string]interface{}{"relation": "admin"}},
							},
						},
					},
					"can_edit": map[string]interface{}{
						"union": map[string]interface{}{
							"child": []map[string]interface{}{
								{"computedUserset": map[string]interface{}{"relation": "can_admin"}},
								{"computedUserset": map[string]interface{}{"relation": "editor"}},
							},
						},
					},
					"can_view": map[string]interface{}{
						"union": map[string]interface{}{
							"child": []map[string]interface{}{
								{"computedUserset": map[string]interface{}{"relation": "can_edit"}},
								{"computedUserset": map[string]interface{}{"relation": "viewer"}},
							},
						},
					},
				},
				"metadata": map[string]interface{}{
					"relations": map[string]interface{}{
						"owner":  map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
						"admin":  map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
						"editor": map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
						"viewer": map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
					},
				},
			},
			{
				"type": "security_group",
				"relations": map[string]interface{}{
					"owner": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"editor": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"viewer": map[string]interface{}{
						"this": map[string]interface{}{},
					},
					"can_edit": map[string]interface{}{
						"union": map[string]interface{}{
							"child": []map[string]interface{}{
								{"computedUserset": map[string]interface{}{"relation": "owner"}},
								{"computedUserset": map[string]interface{}{"relation": "editor"}},
							},
						},
					},
					"can_view": map[string]interface{}{
						"union": map[string]interface{}{
							"child": []map[string]interface{}{
								{"computedUserset": map[string]interface{}{"relation": "can_edit"}},
								{"computedUserset": map[string]interface{}{"relation": "viewer"}},
							},
						},
					},
				},
				"metadata": map[string]interface{}{
					"relations": map[string]interface{}{
						"owner":  map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
						"editor": map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
						"viewer": map[string]interface{}{"directly_related_user_types": []map[string]interface{}{{"type": "user"}}},
					},
				},
			},
		},
	}
}
