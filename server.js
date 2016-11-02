var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var multer = require("multer");
var generateMiDi = require('./miditest')
var app = express();
app.set("view engine", "jade");
app.set("views", __dirname + "/views");
app.post("/upload", multer({
    dest: "./uploads/",
    rename: function (fieldname, filename) {
        return hashCode(filename);
    }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get("/", function (req, res) {
    fs.readdir("./uploads/", function (err, files) {
        res.render("form.jade", {
            files: files
        });
    });
});

app.get("/getAttachments", function (req, res) {
    res.sendFile("/uploads/" + req.query.filename, {root: __dirname});
});

app.get("/removeAttachments", function (req, res) {
    fs.unlinkSync("./uploads/" + req.query.filename);
    res.redirect("/");
});

app.post("/upload", function (req, res) {
    res.redirect("/");
});

app.post("/genrerate", function (req, res) {
    generateMiDi();
    res.redirect("/");
});

app.listen(8080);

function hashCode(str) {
 /*   var hash = 0;
    if (str.length == 0) return hash;
    for (i = 0; i < str.length; i++) {
        char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash >= 0 ? hash : -1 * hash;*/
    return str;
}