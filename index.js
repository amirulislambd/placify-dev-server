const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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

// ─── Connect to MongoDB ─────────────────────────────────────────────────────
client.connect(() => console.log("Connected to MongoDB")).catch(console.dir)


// ─── DB Collections (top level) ───────────────────────────────────────────────
const database = client.db("placify_db");
const jobCollection = database.collection("jobs");
const companyCollection = database.collection("companies");
const applicationCollection = database.collection("applications");
const userCollection = database.collection("user");
const planCollection = database.collection("plans");
const subscriptionCollection = database.collection("subscriptions");
const sessionCollection = database.collection("session");


// ─── Logger ───────────────────────────────────────────────────────────────────
const logger = (req, res, next) => {
  console.log("logger middleware", req.params);
  next();
};

// ─── Middlewares ──────────────────────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    return res.status(401).json({ error: "Unauthorized access" });
  }
  const token = authorizationHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized access" });
  }
  try {
    const session = await sessionCollection.findOne({ token });
    if (!session) return res.status(401).json({ error: "Unauthorized access" });

    const user = await userCollection.findOne({
      _id: new ObjectId(session.userId),
    });
    if (!user) return res.status(401).json({ error: "Unauthorized access" });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized access" });
  }
};

const verifySeeker = (req, res, next) => {
  if (req.user?.role !== "seeker") {
    return res.status(403).json({ error: "Forbidden access" });
  }
  next();
};

const verifyRecruiter = (req, res, next) => {
  if (req.user?.role !== "recruiter") {
    return res.status(403).json({ error: "Forbidden access" });
  }
  next();
};

const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden access" });
  }
  next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ── Jobs ──────────────────────────────────────────────────────────────────────
app.get("/api/jobs", async (req, res) => {
  try {
    const query = {};
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (req.query.companyId) query.companyId = req.query.companyId;
    if (req.query.status) query.status = req.query.status;

    if (req.query.q) {
      query.$or = [
        { jobTitle: { $regex: req.query.q, $options: "i" } },
        { companyName: { $regex: req.query.q, $options: "i" } },
        { category: { $regex: req.query.q, $options: "i" } },
        { location: { $regex: req.query.q, $options: "i" } },
      ];
    }
    if (req.query.category && req.query.category !== "All") {
      query.category = { $regex: req.query.category, $options: "i" };
    }
    if (req.query.jobType && req.query.jobType !== "All") {
      query.jobType = { $regex: req.query.jobType, $options: "i" };
    }
    if (req.query.workMode && req.query.workMode !== "All") {
      query.workMode = { $regex: req.query.workMode, $options: "i" };
    }
    if (req.query.salary) {
      const [min, max] = req.query.salary.split("-").map(Number);
      query.minSalary = { $gte: String(min) };
      query.maxSalary = { $lte: String(max) };
    }

    const [jobs, total] = await Promise.all([
      jobCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      jobCollection.countDocuments(query),
    ]);

    res.json({ jobs, total, page, limit });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get('/api/featured-jobs', async (req, res) => {
  try {
    const jobs = await jobCollection.find().limit( 6).toArray();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post("/api/jobs", async (req, res) => {
  try {
    const result = await jobCollection.insertOne({
      ...req.body,
      createdAt: new Date(),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/jobs/:id", async (req, res) => {
  try {
    const result = await jobCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!result) return res.status(404).json({ error: "Job not found" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Applications ──────────────────────────────────────────────────────────────
app.get("/api/applications", verifyToken, verifySeeker, async (req, res) => {
  try {
    const query = {};
    if (req.query.applicantId) {
      if (req.user._id.toString() !== req.query.applicantId) {
        return res.status(403).json({ error: "Forbidden access" });
      }
      query.applicantId = req.query.applicantId;
    }
    if (req.query.jobId) query.jobId = req.query.jobId;

    const applications = await applicationCollection.find(query).toArray();
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/applications", async (req, res) => {
  try {
    const result = await applicationCollection.insertOne({
      ...req.body,
      createdAt: new Date(),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Plans ─────────────────────────────────────────────────────────────────────
app.get("/api/plans", async (req, res) => {
  try {
    if (req.query.plan_id) {
      const plan = await planCollection.findOne({ plan_id: req.query.plan_id });
      if (!plan) return res.status(404).json({ error: "Plan not found" });
      return res.json(plan);
    }
    const plans = await planCollection.find().toArray();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Subscriptions ─────────────────────────────────────────────────────────────
app.post("/api/subscriptions", async (req, res) => {
  try {
    const data = req.body;
    const [result, updatedResult] = await Promise.all([
      subscriptionCollection.insertOne({ ...data, createdAt: new Date() }),
      userCollection.updateOne(
        { email: data.email },
        { $set: { plan: data.planId } },
      ),
    ]);
    res.json({ result, updatedResult });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Companies ─────────────────────────────────────────────────────────────────
app.get(
  "/api/companies",
  logger,
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const companies = await companyCollection.find().toArray();
      const companiesWithCount = await Promise.all(
        companies.map(async (company) => ({
          ...company,
          jobCount: await jobCollection.countDocuments({
            companyId: company._id.toString(),
          }),
        })),
      );
      res.json(companiesWithCount);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

app.get("/api/my/companies", async (req, res) => {
  try {
    if (!req.query.recruiterId || req.query.recruiterId === "undefined") {
      return res.status(400).json({ error: "Recruiter ID is required" });
    }
    const company = await companyCollection.findOne({
      recruiterId: req.query.recruiterId,
    });
    res.json(company || null);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/companies", async (req, res) => {
  try {
    const result = await companyCollection.insertOne({
      ...req.body,
      createdAt: new Date(),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.patch(
  "/api/companies/:id",
  logger,
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const result = await companyCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: req.body.status } },
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get("/api/stats", verifyToken, async (req, res) => {
  try {
    const { role } = req.user;
    const userId = req.user._id.toString();

    if (role === "admin") {
      const [totalUsers, totalCompanies, totalJobs, pendingApprovals] = await Promise.all([
        userCollection.countDocuments(),
        companyCollection.countDocuments(),
        jobCollection.countDocuments(),
        companyCollection.countDocuments({ status: "pending" }),
      ]);
      return res.json({
        totalUsers,
        totalCompanies,
        totalJobs,
        pendingApprovals,
        reportedJobs: 0,
        revenue: "$48k",
      });
    }

    if (role === "recruiter") {
      const company = await companyCollection.findOne({ recruiterId: userId });
      if (!company) {
        return res.json({ totalJobs: 0, totalApplicants: 0, activeJobs: 0, closedJobs: 0 });
      }
      const companyIdStr = company._id.toString();
      
      const [totalJobs, activeJobs, closedJobs] = await Promise.all([
        jobCollection.countDocuments({ companyId: companyIdStr }),
        jobCollection.countDocuments({ companyId: companyIdStr, status: "active" }),
        jobCollection.countDocuments({ companyId: companyIdStr, status: { $ne: "active" } }),
      ]);

      // Collect recruiter's jobs to count applications
      const recruiterJobs = await jobCollection.find({ companyId: companyIdStr }).toArray();
      const jobIds = recruiterJobs.map(j => j._id.toString());
      const totalApplicants = jobIds.length > 0 
        ? await applicationCollection.countDocuments({ jobId: { $in: jobIds } })
        : 0;

      return res.json({
        totalJobs,
        totalApplicants,
        activeJobs,
        closedJobs,
      });
    }

    if (role === "seeker") {
      const [jobsApplied, pendingReview, interviews, rejected] = await Promise.all([
        applicationCollection.countDocuments({ applicantId: userId }),
        applicationCollection.countDocuments({ applicantId: userId, status: { $in: ["applied", "pending"] } }),
        applicationCollection.countDocuments({ applicantId: userId, status: "interview" }),
        applicationCollection.countDocuments({ applicantId: userId, status: "rejected" }),
      ]);

      return res.json({
        jobsApplied,
        pendingReview,
        interviews,
        rejected,
      });
    }

    res.status(400).json({ error: "Invalid role" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Users ─────────────────────────────────────────────────────────────────────
app.get("/api/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      userCollection.find().skip(skip).limit(limit).toArray(),
      userCollection.countDocuments(),
    ]);
    res.json({ users, total, page, limit });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));

module.exports = app;