const express = require('express')
require('dotenv').config()
const app = express()
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = 5000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("placify_db");
    const jobCollection = database.collection("jobs");

    // post a job
    app.post("/api/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    // get all jobs
    app.get("/api/jobs", async (req, res) => {
      const jobs = await jobCollection.find().toArray();
      res.send(jobs);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


