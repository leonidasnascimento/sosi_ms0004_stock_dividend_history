var express = require('express');
var router = express.Router();
var dal = require('../data/dal_mkt_history')
var HttpStatus = require('http-status-codes')
const cacheDb = require("sosi_cache_db_manager");
const cacheDbKey_DividendAnalysis = "sosi_ms0004_stock_dividend_history.dividend_analysis"

var getLastPrice = function (input_json_arr) {
  var return_data = {}

  if (input_json_arr != null && input_json_arr.history != null) {
    //Sorting
    input_json_arr.history.sort(function (a, b) {
      var a_date = a.date.split("/")
      var b_date = b.date.split("/")
      var day_index = 0;
      var month_index = 1;
      var year_index = 2;

      if (a_date == null || b_date == null || a_date.length < 3 || b_date.length < 3) {
        return
      }

      return new Date(Number(b_date[year_index]), Number(b_date[month_index]), Number(b_date[day_index])) - new Date(Number(a_date[year_index]), Number(a_date[month_index]), Number(a_date[day_index]))
    })

    return_data = input_json_arr.history[0]

  }

  return return_data
}

var getDividendAnalysisData = function (data) {
  var last_price_aux = {}
  var result = {
    code: "",
    dividend_last_price: 0.00
  }

  if (data === null || data === undefined || data === {}) {
    return result;
  } else {
    last_price_aux = getLastPrice(data);

    result.code = data.code;
    result.dividend_last_price = 0.00;

    if (last_price_aux !== null && last_price_aux !== undefined && last_price_aux !== {} && ('earning' in last_price_aux)) {
      result.dividend_last_price = last_price_aux.earning;
    }

    return result;
  }
}

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

/* **********************************

  DIVIDEND ANALYSIS ENDPOINT SECTION

************************************* */

router.get('/dividend_analysis', function (req, res, next) {
  var cacheDbMngr = new cacheDb(cacheDbKey_DividendAnalysis)

  //Trying to get data from Redis
  cacheDbMngr.getValue(function (obj) {
    if (obj.data !== null) {
      res.status(HttpStatus.OK).send(JSON.parse(obj.data));
    } else {
      //Going to main db to retrieve the data if some error occurr when getting from Redis
      new dal()
        .get_all_history(function (data) {
          var result = getDividendAnalysisData(data)
          res.status(HttpStatus.OK).send(result);
        }, function (data) {
          res.status(HttpStatus.METHOD_FAILURE).send(data);
        });
    }
  }, function (obj) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(obj);
  })
});

router.put('/dividend_analysis', function (req, res, next) {
  new dal().get_all_history(function (data) {
    var cacheDbMngr = new cacheDb(cacheDbKey_DividendAnalysis)
    var lstData = []

    if (data === null || data === undefined) {
      res.status(HttpStatus.EXPECTATION_FAILED).send("No data");
    } else {
      data.forEach(d => {
        var result = getDividendAnalysisData(d)
        lstData.push(result);
      })

      cacheDbMngr.setValue(lstData, function (obj) {
        res.status(HttpStatus.OK).send(obj)
      }, function (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error)
      });
    }
  }, function (data) {
    res.status(HttpStatus.METHOD_FAILURE).send(data)
  });
});

module.exports = router;