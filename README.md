# Planetary Response Network
Create Zooniverse subjects via Planet Labs API using area of interest (AOI) queries.

## Getting Started
Clone and `npm install`. A number of environmental variables must be set:

* `PLANET_API_KEY` to retrieve the mosaics. You'll need an API key from Planet Labs
* to deploy to subjects to your Zooniverse project you'll need to [build a project](https://www.zooniverse.org/lab) and set the variables `ZOONIVERSE_USERNAME` and `ZOONIVERSE_PASSWORD` with your username and password, respectively
* `AMAZON_ACCESS_KEY_ID`, `AMAZON_SECRET_ACCESS_KEY` and `AMAZON_S3_BUCKET` (an S3 bucket in order to deploy subjects)
* `SESSION_SECRET` a secret phrase for hashing sessions
* `PANOPTES_API_APPLICATION` and `PANOPTES_API_SECRET` the client id and secret from the Doorkeeper apps page

Run `docker-compose up`. The main application container and a redis container will be started. You can then upload KML files at http://localhost:3736.

## Running outside of Docker
### With Redis queue
1) Set up a [redis](https://redis.io) server.
2) Run `REDIS_HOST=your-redis-host.com npm start` (if you need to set a custom port for redis, use `REDIS_PORT`)

### Without Redis queue
If you don't want to manage running a Redis queue, you can run the app directly with `node server --use-queue=0` to have the app spawn generation tasks directly instead of posting them to the Redia queue.

## Tests
We have some coverage via unit tests which can be run with `npm test`
