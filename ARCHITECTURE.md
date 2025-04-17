# WIP
This is going to be for a "meta-indexer", a more specialized indexer that transforms and enriches the data provded from another indexer called torii for the starknet blockchain.

The actual system is that we have an ingester that is continually fetching data from the torii indexer (using an initial poll then a subscribe on newer events), then it immediately goes into a parser that converts the raw event data into application controlled types (e.g. from the torii format to a rust `struct` or enum). This is also the point where the data is stored in the database for persistance + replay prevention.

Once that is done, we have one of two choices (don't really know the best way yet):
- Once it is stored, directly process it sequentially
- Or add a task to a queue to update the datastore.

The rest can be processed with cron jobs (like leaderboard updates), or directly with raw queries (less performant, but rate limits can handle the issue)

For the database, we will use a traditionnal postgres database, for now hosted on scaleway, with the possibility to bring it back in house if the need ever arises.
Our load will really be read intensive, but not write intensive, so we can easily use a master writer colocated with the indexer, and a distributed set of read-only followers all round the world.
