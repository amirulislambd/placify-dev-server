const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const logger = (req, res, next) => {
  console.log("logger middleware", req.params);
  next();
};

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
    const planCollection = database.collection("plans");
    const subscriptionCollection = database.collection("subscriptions");
    const sessionCollection = database.collection("session");

    // verification related

    const verifyToken = async (req, res, next) => {
      console.log("verifyJWT middleware", req.headers);
      const authorizationHeader = req.headers.authorization;
      if (!authorizationHeader) {
        return res.status(401).json({ error: "Unauthorized access" });
      }
      const token = authorizationHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const query = { token: token };
      const session = await sessionCollection.findOne(query);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized access" });
      }
      const userId = session.userId;
      const userQuery = {
        _id: new ObjectId(userId),
      };
      const user = await userCollection.findOne(userQuery);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized access" });
      }
      req.suer = user;
      next();
    };

    // must be used after verifyToken middleware
    const verifySeeker = async (req, res, next) => {
      if (req.suer.role !== "seeker") {
        return res.status(403).json({ error: "Forbidden access" });
      }

      next();
    };

    // must be used after verifyToken middleware
    const verifyRecruiter = async (req, res, next) => {
      if (req.suer?.role !== "recruiter") {
        return res.status(403).json({ error: "Forbidden access" });
      }
      next();
    };

    // must be used after verifyToken middleware
    const verifyAdmin = async (req, res, next) => {
      if (req.suer?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden access" });
      }
      next();
    };

    // user related apis
    app.get("/api/users", async (req, res) => {
      const users = await userCollection.find().toArray();
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

    app.get("/api/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    // application related apis
    app.get(
      "/api/applications",
      verifyToken,
      verifySeeker,
      async (req, res) => {
        const query = {};
        if (req.query.applicantId) {
          query.applicantId = req.query.applicantId;

          // check whether asking for user information or someone else's
          console.log(req.suer, req.query.applicantId);
          if (req.suer._id.toString() !== req.query.applicantId) {
            return res.status(403).json({ error: "Forbidden access" });
          }
        }
        if (req.query.jobId) {
          query.jobId = req.query.jobId;
        }
        const cursor = await applicationCollection.find(query);
        const applications = await cursor.toArray();
        res.send(applications);
      },
    );

    app.post("/api/applications", async (req, res) => {
      const application = req.body;
      const newApplication = {
        ...application,
        createdAt: new Date(),
      };
      const result = await applicationCollection.insertOne(newApplication);
      res.send(result);
    });

    // plan related apis
    app.get("/api/plans", async (req, res) => {
      const query = {};
      if (req.query.plan_id) {
        query.plan_id = req.query.plan_id;
      }
      const plan = await planCollection.findOne(query);
      res.send(plan);
    });

    // subscriptions related apis
    app.post("/api/subscriptions", async (req, res) => {
      const data = req.body;
      const newSubscription = {
        ...data,
        createdAt: new Date(),
      };
      const result = await subscriptionCollection.insertOne(newSubscription);

      // updated the user plan information
      const filter = { email: data.email };
      const updatePlan = {
        $set: {
          plan: data.planId,
        },
      };
      const updatedResult = await userCollection.updateOne(filter, updatePlan);
      res.send({ result, updatedResult });
    });

    // company related apis
    // app.get("/api/companies", async (req, res) => {
    //   const companies = await companyCollection.find().toArray();
    //   res.send(companies);
    // });
    app.get(
      "/api/companies",
      logger,
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const companies = await companyCollection.find().toArray();

        for (company of companies) {
          const filter = { companyId: company._id.toString() };
          const jobCount = await jobCollection.countDocuments(filter);
          company.jobCount = jobCount;
        }

        res.send(companies);
      },
    );

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

    app.patch(
      "/api/companies/:id",
      logger,
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const { status } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: { status: status },
        };
        const result = await companyCollection.updateOne(filter, updatedDoc);
        res.send(result);
      },
    );

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
