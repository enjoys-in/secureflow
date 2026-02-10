package repository

import "context"

// Repository is the generic interface for all database repositories.
// Every entity repo (UserRepo, FirewallRuleRepo, etc.) embeds this interface.
type Repository[T any] interface {
	FindByID(ctx context.Context, id string) (*T, error)
	FindOne(ctx context.Context, filter map[string]interface{}) (*T, error)
	FindAll(ctx context.Context, filter map[string]interface{}, limit, offset int) ([]T, error)
	Create(ctx context.Context, entity *T) error
	FindByIDAndUpdate(ctx context.Context, id string, updates map[string]interface{}) (*T, error)
	FindAndUpdate(ctx context.Context, filter map[string]interface{}, updates map[string]interface{}) (*T, error)
	DeleteOne(ctx context.Context, id string) error
	DeleteMany(ctx context.Context, filter map[string]interface{}) (int64, error)
}
