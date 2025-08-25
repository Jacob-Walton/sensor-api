# Sensor API

DIY home environment monitor: Rust Lambdas behind API Gateway, plus a Next.js dashboard frontend.

## What it does
- POST sensor readings to `/readings` (secured with an API key).
- Store readings in DynamoDB with TTL (auto-expire) and an hourly cleanup to cap history.
- GET recent readings from `/readings` for the frontend dashboard.

## Architecture
- AWS API Gateway (REST) → Lambda (Rust, arm64, provided.al2023)
- DynamoDB table `sensor-readings` (PK: `sensorId`, SK: `timestamp`, TTL: `ttl`)
- Scheduled cleanup Lambda (EventBridge rate: 1 hour)
- Frontend: Next.js 15 app

## Prerequisites
- AWS credentials configured
- Rust toolchain (nightly) and cargo-lambda (build.sh installs if missing)
- Node 22 (for frontend) and optionally Docker
- Terraform/OpenTofu 1.5+

## Build Lambdas
From repo root:

```sh
./build.sh
```

This produces zip artifacts under `lambda/target/lambda/*/bootstrap.zip` used by IaC.

## Provision infrastructure
In `infrastructure/` (Terraform/OpenTofu):

```sh
# set your API key (or put it in a tfvars file)
export SENSOR_API_KEY="<your-api-key>"

# init and apply (Terraform users: replace `tofu` with `terraform`)
tofu init
tofu apply -var "api_key=${SENSOR_API_KEY}"
```

Key variables: `aws_region` (default eu-west-2), `environment` (default production), `max_readings` (default 1000), `api_key` (required).

Outputs:
- `api_endpoint` – base URL including stage (e.g. `https://...execute-api.eu-west-2.amazonaws.com/production`)
- `table_name` – DynamoDB table name

## API
- POST `/readings`
	- Headers: `x-api-key: <api key>`
	- Body (JSON): `{ "temperature": number, "humidity": number, "pressure": number, "gas_resistance": number }`
- GET `/readings?limit=100` (default 100, max 1000)

Example POST:

```sh
curl -X POST "$API_URL/readings" \
	-H "Content-Type: application/json" \
	-H "x-api-key: $SENSOR_API_KEY" \
	-d '{"temperature":22.1,"humidity":50.3,"pressure":101325,"gas_resistance":120000}'
```

Item shape in DynamoDB (additional fields added by backend):
`sensorId` (e.g. `sensor-1`), `timestamp` (ms), `received_at` (RFC3339), `ttl` (epoch seconds)

## Frontend (Next.js dashboard)
The frontend proxies API calls via a rewrite. Set `API_URL` to the `api_endpoint` output.

Local dev:

```sh
cd frontend
export API_URL="https://.../production"
npm ci
npm run dev
```

Docker:

```sh
cd frontend
docker run -d --name sensors_frontend -p 8001:3000 -e API_URL="https://.../production" $(docker build -q .)
```

If you prefer docker-compose, add under `services.frontend.environment`:
`API_URL=${API_URL}` and supply it via a `.env` file or your shell.

The dashboard fetches `/api/readings` and refreshes every 5s.

## Repo layout
- `lambda/` – Rust Lambda functions: `submit_reading`, `get_readings`, `cleanup_old`
- `infrastructure/` – API Gateway, Lambdas, DynamoDB, EventBridge (Terraform/OpenTofu)
- `frontend/` – Next.js 15 app (components and styles under `src/`)

## Notes
- Pressure is returned in Pa by the API and scaled to hPa in the frontend.