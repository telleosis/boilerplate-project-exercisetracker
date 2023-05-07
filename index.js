const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 3000,
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

var Schema = mongoose.Schema;

var exerciseUsersSchema = new Schema({
  username: { type: String, unique: true, required: true },
});

var ExerciseUsers = mongoose.model("ExerciseUsers", exerciseUsersSchema);

var exercisesSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, min: 1, required: true },
  date: { type: Date, default: Date.now },
});

var Exercises = mongoose.model("Exercises", exercisesSchema);

app.post("/api/users", function (req, res) {
  if (req.body.username === "") {
    return res.json({ error: "username is required" });
  }

  let username = req.body.username;
  let _id = "";

  ExerciseUsers.findOne({ username: username }, function (err, data) {
    if (!err && data === null) {
      let newUser = new ExerciseUsers({
        username: username,
      });

      newUser.save(function (err, data) {
        if (!err) {
          _id = data["_id"];

          return res.json({
            _id: _id,
            username: username,
          });
        }
      });
    } else {
      return res.json({ error: "username already exists" });
    }
  });
});

app.get("/api/users", function (req, res) {
  ExerciseUsers.find({}, function (err, data) {
    if (!err) {
      return res.json(data);
    }
  });
});

app.post("/api/users/:_id/exercises", function (req, res) {
  if (req.params._id === "0") {
    return res.json({ error: "_id is required" });
  }

  if (req.body.description === "") {
    return res.json({ error: "description is required" });
  }

  if (req.body.duration === "") {
    return res.json({ error: "duration is required" });
  }

  let userId = req.params._id;
  let description = req.body.description;
  let duration = parseInt(req.body.duration);
  let date = req.body.date !== undefined ? new Date(req.body.date) : new Date();

  if (isNaN(duration)) {
    return res.json({ error: "duration is not a number" });
  }

  if (date == "Invalid Date") {
    return res.json({ error: "date is invalid" });
  }

  ExerciseUsers.findById(userId, function (err, data) {
    if (!err && data !== null) {
      let newExercise = new Exercises({
        userId: userId,
        description: description,
        duration: duration,
        date: date,
      });

      newExercise.save(function (err2, data2) {
        if (!err2) {
          return res.json({
            _id: data["_id"],
            username: data["username"],
            description: data2["description"],
            duration: data2["duration"],
            date: new Date(data2["date"]).toDateString(),
          });
        }
      });
    } else {
      return res.json({ error: "user not found" });
    }
  });
});

app.get("/api/users/:_id/exercises", function (req, res) {
  res.redirect("/api/users/" + req.params._id + "/logs");
});

app.get("/api/users/:_id/logs", function (req, res) {
  let userId = req.params._id;
  let findConditions = { userId: userId };

  if (
    (req.query.from !== undefined && req.query.from !== "") ||
    (req.query.to !== undefined && req.query.to !== "")
  ) {
    findConditions.date = {};

    if (req.query.from !== undefined && req.query.from !== "") {
      findConditions.date.$gte = new Date(req.query.from);
    }

    if (findConditions.date.$gte == "Invalid Date") {
      return res.json({ error: "from date is invalid" });
    }

    if (req.query.to !== undefined && req.query.to !== "") {
      findConditions.date.$lte = new Date(req.query.to);
    }

    if (findConditions.date.$lte == "Invalid Date") {
      return res.json({ error: "to date is invalid" });
    }
  }

  let limit = req.query.limit !== undefined ? parseInt(req.query.limit) : 0;

  if (isNaN(limit)) {
    return res.json({ error: "limit is not a number" });
  }

  ExerciseUsers.findById(userId, function (err, data) {
    if (!err && data !== null) {
      Exercises.find(findConditions)
        .sort({ date: "asc" })
        .limit(limit)
        .exec(function (err2, data2) {
          if (!err2) {
            return res.json({
              _id: data["_id"],
              username: data["username"],
              log: data2.map(function (e) {
                return {
                  description: e.description,
                  duration: e.duration,
                  date: new Date(e.date).toDateString(),
                };
              }),
              count: data2.length,
            });
          }
        });
    } else {
      return res.json({ error: "user not found" });
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }

  res.status(errCode).type("txt").send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// const app = express();

// // Basic Configuration
// app.use(
//   bodyParser.urlencoded({
//     extended: false,
//   })
// );
// app.use(cors());
// app.use(express.json());

// const mySecret = process.env["MONGO_URI"];

// mongoose.connect(mySecret, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   serverSelectionTimeoutMS: 3000, // Timeout after 5s instead of 30s
// });

// const connection = mongoose.connection;

// connection.once("open", () => {
//   console.log("MongoDB database connection established successfully");
// });

// app.use("/public", express.static(process.cwd() + "/public"));
// app.get("/", function (req, res) {
//   res.sendFile(process.cwd() + "/views/index.html");
// });

// //Create Schema
// const { Schema } = mongoose;

// const ExerciseSchema = new Schema({
//   userId: { type: String, required: true },
//   description: { type: String, required: true },
//   duration: { type: Number, required: true },
//   date: { type: Date, required: true },
// });
// const UserSchema = new Schema({
//   username: String,
// });
// const User = mongoose.model("User", UserSchema);
// const Exercise = mongoose.model("Exercise", ExerciseSchema);

// //Create functions
// //Create POST /api/users endpoint to add a new user
// app.post("/api/users", async (req, res) => {
//   try {
//     const newuser = req.body.username;
//     let findUser = await User.findOne({
//       username: newuser,
//     });
//     if (findUser) {
//       res.json({
//         username: findUser.username,
//       });
//     } else {
//       findUser = new User({
//         username: newuser,
//       });
//       await findUser.save();
//       res.json({
//         username: findUser.username,
//         _id: findUser._id,
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     res.status(500).json("Server error occured...");
//   }
// });

// // Create GET /api/users endpoint to find a user
// app.get("/api/users", (req, res) => {
//   User.find({}, (err, data) => {
//     if (err) return res.json({ error: err });
//     return res.json(data);
//   });
// });

// // Create POST /api/users/:_id/exercises endpoint to add a new exercise
// app.post("/api/users/:_id/exercises", async (req, res) => {
//   const id = req.params._id;
//   const { description, duration, date } = req.body;
//   //const { description, duration, date } = JSON.parse(JSON.stringify(req.body));

//   await User.findById(id, (err, userData) => {
//     if (err || !userData) {
//       res.send("Could not find user");
//     } else {
//       const newExercise = new Exercise({
//         userId: id,
//         description,
//         duration,
//         date: new Date(date),
//       });
//       newExercise.save((err, data) => {
//         if (err || !data) {
//           res.send("There was an error saving this exercise");
//         } else {
//           const { description, duration, date, _id } = data;
//           res.json({
//             _id: userData.id,
//             username: userData.username,
//             date: date.toDateString(), //Format Wed Feb 01 2023
//             duration,
//             description,
//           });
//         }
//       });
//     }
//   });
// });

// //Create GET /api/users/:_id/logs endpoint to retrieve a full exercise log of any user
// app.get("/api/users/:_id/logs", async (req, res) => {
//   const { from, to, limit } = req.query;
//   const { description, duration, date } = req.body;
//   const id = req.params._id;

//   try {
//     await User.findById(id).exec((err, userData) => {
//       console.log("Param ID: ", id);
//       console.log("User Data: ", userData);
//       if (err || !userData) {
//         res.send("Could not find user"); //
//         console.log("Could not find user");
//       } else {
//         let dateObj = {};
//         if (from) {
//           dateObj["$gte"] = new Date(from);
//         }
//         if (to) {
//           dateObj["$lte"] = new Date(to);
//         }
//         let filter = {
//           userId: id,
//         };
//         if (from || to) {
//           filter.date = dateObj;
//         }
//         let nonNullLimit = limit ?? 500;
//         Exercise.find(filter)
//           .limit(+nonNullLimit)
//           .exec((err, data) => {
//             if (err || !data) {
//               res.json({});
//             } else {
//               const count = data.length;
//               const rawLog = data;
//               console.log("rawLog: ", rawLog);
//               console.log("data:", data);
//               const { username, _id } = userData;
//               console.log("userData:", userData);

//               const log =
//                 data &&
//                 data.map((l) => ({
//                   description: l.description,
//                   duration: l.duration,
//                   date: l.date?.toDateString(),
//                 }));
//               console.log("Log: ", log);
//               res.json({ username, count, _id, log });
//             }
//           });
//       }
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json("Server error");
//   }
// });

// const listener = app.listen(process.env.PORT || 3000, () => {
//   console.log("Your app is listening on port " + listener.address().port);
// });
