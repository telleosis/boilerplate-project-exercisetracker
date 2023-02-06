const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;
const Mongoose = require("mongoose");
const bodyParser = require("body-parser");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(cors());
app.use(express.json());

const mySecret = process.env["MONGO_URI"];

Mongoose.connect(mySecret, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
});

const connection = Mongoose.connection;

connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

//Create User Schema
const Schema = Mongoose.Schema;
const usersSchema = new Schema({
  username: String,
});
const exerciseSchema = new Schema({
  id: String,
  description: String,
  duration: String,
  date: String,
});
const Users = Mongoose.model("Users", usersSchema);
const Exercises = Mongoose.model("Exercises", exerciseSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//POST data to /api/users
app.post("/api/users", async (req, res) => {
  //collect form data
  const fdusername = req.body.username;
  console.log("Form Data Username collected :", fdusername);

  //post it to mongodb
  try {
    // check if its already in the database
    let findOne = await Users.findOne({
      username: fdusername,
    });
    if (findOne) {
      res.json({
        username: findOne.username,
        _id: findOne._id,
      });
    } else {
      // if it does not exist yet then create new one and response with the result
      findOne = new Users({
        username: fdusername,
      });
      await findOne.save();
      res.json({
        username: findOne.username,
        _id: findOne._id,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Database Server erorr...");
  }
});

//GET data from /api/users
app.get("/api/users", async (req, res) => {
  //Return an array of all usernames and IDs
  let usersArray = [];
  try {
    const findUsers = (username, _id, done) => {
      Users.find({ username: username }, { _id: _id }, function (err, data) {
        if (err) return console.error(err);
        usersArray.push(data);
        done(null, data);
      });
    };
  } catch (error) {
    console.log(error);
    res.status(500).json("Server error");
  }
});

// app.post('/api/users/:_id/exercises', async (req, res) => {
//   //collect form data
//   const fdId = req.body._id;
//   const fdDesc = req.body.description;
//   const fdDura = req.body.duration;
//   const fdDate = req.body.date;

//   console.log('Form Data Username collected :', fdId,fdDesc,fdDura,fdDate);

//   //post it to mongodb
//    try {
//       // check if user already exist in the database
//       let findOne = await Exercises.findOne({
//         id: fdId
//       })
//       if (findOne) {
//         res.json({
//           username: findOne.username,
//           description: findOne.description,
//           duration: findOne.duration,
//           date: findOne.date,
//           _id: findOne._id
//         })
//       } else {
//         // if it does not exist yet then create new one and response with the result
//         findOne = new Exercises({
//           username: username,
//           description: description,
//           duration: duration,
//           date: date,
//           _id: _id
//         })
//         await findOne.save()
//         res.json({
//           username: findOne.username,
//           description: findOne.description,
//           duration: findOne.duration,
//           date: findOne.date,
//           _id: findOne._id
//         })
//       }
//     } catch (err) {
//       console.error(err)
//       res.status(500).json('Database Server erorr...')
//     }
// });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
