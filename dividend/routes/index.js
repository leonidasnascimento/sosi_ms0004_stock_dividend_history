var express = require('express');
var router = express.Router();
var dal = require('../data/dal_mkt_history')
var HttpStatus = require('http-status-codes')

/* GET home page. */
router.get('/', function (req, res, next) {
  if ((Object.keys(req.query).length === 0) || (Object.keys(req.query).indexOf("code") < 0)) {
    res.status(HttpStatus.EXPECTATION_FAILED).send("Stock code not informed")
  }

  new dal().get_history(req.query["code"], function (data) {
    res.status(HttpStatus.OK).send(data);
  }, function (data) {
    res.status(HttpStatus.METHOD_FAILURE).send(data)
  });
});

router.post('/', function (req, res, next) {
  if (!req.body) {
    res.status(HttpStatus.LENGTH_REQUIRED).send("Body message is required")
    return
  }

  if (!req.body.code) {
    res.status(HttpStatus.LENGTH_REQUIRED).send("Stock code is required")
    return
  }

  // Adding new history to the database
  new dal().add_history(req.body, function (data) {
    res.status(HttpStatus.OK).send(data)
  }, function (data) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(data)
  })
});

module.exports = router;