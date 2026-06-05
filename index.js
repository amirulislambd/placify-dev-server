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
    const companyCollection = database.collection("companies");

    // post a job
    app.post("/api/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    // get all jobs
    app.get("/api/jobs", async (req, res) => {
      const query = {};
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
      const cursor = await jobCollection.find(query);
      const jobs = await cursor.toArray();
      res.send(jobs);
    });

    // company related apis

    app.get("/api/my/companies", async (req, res) => {
      const query = {};
      if (req.query.recruiterId) {
        query.recruiterId = req.query.recruiterId;
      }
      const cursor = await companyCollection.find(query);
      const companies = await cursor.toArray();
      res.send(companies);
    });

    app.post("/api/companies", async (req, res) => {
      const newCompany = req.body;
      const result = await companyCollection.insertOne(newCompany);
      res.send(result);
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


