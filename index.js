const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const applicationCollection = database.collection("applications");
    const userCollection = database.collection("user");

    // user related apis
    app.get("/api/users", async (req, res) => {
      const users = await userCollection.find().skip(4).toArray();
      res.send(users);
    });

    // post a job
    app.post("/api/jobs", async (req, res) => {
      const Job = req.body;
      const newJob = {
        ...Job,
        createdAt: new Date(),
      };
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    app.get("/api/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    // get all jobs by company'
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

    // application related apis
    app.post("/api/applications", async (req, res) => {
      const application = req.body;
      const newApplication = {
        ...application,
        createdAt: new Date(),
      };
      const result = await applicationCollection.insertOne(newApplication);
      res.send(result);
    });


    // company related apis
    app.get("/api/companies", async (req, res) => {
      const companies = await companyCollection.find().skip(1).toArray();
      res.send(companies);
    });

    app.get("/api/my/companies", async (req, res) => {
      try {
        const query = {};
        if (!req.query.recruiterId || req.query.recruiterId === "undefined") {
          return res.status(400).json({ error: "Recruiter ID is required" });
        }

        query.recruiterId = req.query.recruiterId;
        const company = await companyCollection.findOne(query);
        if (!company) {
          return res.json(null);
        }
        res.json(company);
      } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.post("/api/companies", async (req, res) => {
      const company = req.body;
      const newCompany = {
        ...company,
        createdAt: new Date(),
      };
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
  console.log(`Example app listening on port ${port}`);
});
