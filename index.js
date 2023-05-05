require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();

// Basic Configuration
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(cors());
app.use(express.json());

const mySecret = process.env["MONGO_URI"];

mongoose.connect(mySecret, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 3000, // Timeout after 5s instead of 30s
});

const connection = mongoose.connection;

connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

app.use("/public", express.static(process.cwd() + "/public"));
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

//Create Schema
const { Schema } = mongoose;

const ExerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});
const UserSchema = new Schema({
  username: String,
});
const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);

//Create functions
//Create POST /api/users endpoint to add a new user
app.post("/api/users", async (req, res) => {
  try {
    const newuser = req.body.username;
    let findUser = await User.findOne({
      username: newuser,
    });
    if (findUser) {
      res.json({
        username: findUser.username,
      });
    } else {
      findUser = new User({
        username: newuser,
      });
      await findUser.save();
      res.json({
        username: findUser.username,
        _id: findUser._id,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Server error occured...");
  }
});

// Create GET /api/users endpoint to find a user
app.get("/api/users", (req, res) => {
  User.find({}, (err, data) => {
    if (err) return res.json({ error: err });
    return res.json(data);
  });
});

// Create POST /api/users/:_id/exercises endpoint to add a new exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  //const { description, duration, date } = JSON.parse(JSON.stringify(req.body));

  await User.findById(id, (err, userData) => {
    if (err || !userData) {
      res.send("Could not find user");
    } else {
      const newExercise = new Exercise({
        userId: id,
        description,
        duration,
        date: new Date(date),
      });
      newExercise.save((err, data) => {
        if (err || !data) {
          res.send("There was an error saving this exercise");
        } else {
          const { description, duration, date, _id } = data;
          res.json({
            _id: userData.id,
            username: userData.username,
            date: date.toDateString(), //Format Wed Feb 01 2023
            duration,
            description,
          });
        }
      });
    }
  });
});

//Create GET /api/users/:_id/logs endpoint to retrieve a full exercise log of any user
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const { description, duration, date } = req.body;
  const id = req.params._id;

  try {
    await User.findById(id).exec((err, userData) => {
      console.log("Param ID: ", id);
      console.log("User Data: ", userData);
      if (err || !userData) {
        res.send("Could not find user"); //
        console.log("Could not find user");
      } else {
        let dateObj = {};
        if (from) {
          dateObj["$gte"] = new Date(from);
        }
        if (to) {
          dateObj["$lte"] = new Date(to);
        }
        let filter = {
          userId: id,
        };
        if (from || to) {
          filter.date = dateObj;
        }
        let nonNullLimit = limit ?? 500;
        Exercise.find(filter)
          .limit(+nonNullLimit)
          .exec((err, data) => {
            if (err || !data) {
              res.json({});
            } else {
              const count = data.length;
              const rawLog = data;
              console.log("rawLog: ", rawLog);
              console.log("data:", data);
              const { username, _id } = userData;
              console.log("userData:", userData);

              const log =
                data &&
                data.map((l) => ({
                  description: l.description,
                  duration: l.duration,
                  date: l.date?.toDateString(),
                }));
              console.log("Log: ", log);
              res.json({ username, count, _id, log });
            }
          });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json("Server error");
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
