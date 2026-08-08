WITH unique_manual_counterparty AS (
	SELECT
		"user_id",
		"name",
		"address",
		min("id") AS "id"
	FROM "ammo_counterparty"
	WHERE "catalog_id" IS NULL
	GROUP BY "user_id", "name", "address"
	HAVING count(*) = 1
)
UPDATE "ammo_transaction" AS "transaction"
SET
	"counterparty_id" = "counterparty"."id",
	"updated_at" = now()
FROM unique_manual_counterparty AS "counterparty"
WHERE "transaction"."counterparty_id" IS NULL
	AND "transaction"."counterparty_name" = "counterparty"."name"
	AND "transaction"."counterparty_address" = "counterparty"."address"
	AND "transaction"."user_id" = "counterparty"."user_id";
