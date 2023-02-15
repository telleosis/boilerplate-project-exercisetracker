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
  serverSelectionTimeoutMS: 30000, // Timeout after 30s
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

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
