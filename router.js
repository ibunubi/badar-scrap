'use strict';

var express = require('express'),
  request = require('request'),
  url = require('url'),
  util = require('util'),
  cheerio = require('cheerio'),
  fs = require('fs'),
  router = express.Router(),
  download = require('./download');

// generate folder requirement
router.get('/', (req, res) => {
  var dirMain = ['data', 'content', 'images'];
  let dir = '';
  dirMain.map((value, index) => {
    if(index < 1)
      dir = '.';
    dir += '/' + value;
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
  });

  var dirData = ['images', 'sound'];
  dirData.map((value, index) => {
    var mkdir = dir + '/' + value;
    if (!fs.existsSync(mkdir)){
      fs.mkdirSync(mkdir);
    }
  });
  
  res.send('Run me first please muehehehe :D');
});


// get table of content
router.get('/table-of-content', (req, res) => {
  let url = 'http://badaronline.com/daftar-isi';

  request(url, (error, response, html) => {
    if (!error && response.statusCode == 200) {
      
      let $ = cheerio.load(html);
      let data = [];

      $('#main-wrapper .entry ul li a').each((i, dom) => {
        var url = $(dom).attr('href');
        var title = $(dom).html();
        data.push({url:url, title:title});
      });

      fs.writeFile('./data/table-of-content.json', JSON.stringify(data, null, 2), (err) => {
        if (err) throw err;
        console.log('Table of content moved to json file!');
      });

    } else {
      console.log(error);
    }
  });

  res.send('Check your logs!');

});


// get content data
router.get('/content', (req, res) => {
  let loadContent = fs.readFileSync('./data/table-of-content.json');
  let tableOfContent = JSON.parse(loadContent);

  console.log('Opening table of content');

  Promise.all(tableOfContent.map((o, i) => {
    console.log('Reading table of content');
    return new Promise((resolve, reject) => {
      request(o.url,  (error, response, html) => {
        if (error) {return reject(error);}

        let $ = cheerio.load(html);
        let img = [];

        $('#main-wrapper .entry img').each((i, image) => {
          let srcUrl = $(image).attr('src');
          let localUrl = './data/content/images/' + srcUrl.split('/').pop();

          img.push({local:localUrl});

          $(image).attr('src', localUrl);
        });


        var qs = $('#main-wrapper .entry p.audioplayer_container param[name="flashvars"]').attr('value');
        qs = '?' + qs;
        qs = qs.replace(/&amp;/g, '&');
        qs = url.parse(qs, true );
        qs = qs.query;
        var soundFile = qs.soundFile;
        // soundFile = new Buffer(soundFile, 'base64').toString('ascii');
        // soundFile = soundFile.split('/').pop();
        // soundFile = './data/content/sound/' + soundFile;

        let delAfterThisP = false;
        $('#main-wrapper .entry p').each((i, paragraph) => {
          if(delAfterThisP == true) {
            $(paragraph).remove();
          }
          if($(paragraph).text().toLowerCase() == "dengarkan kajian:") {
            $(paragraph).remove();
            delAfterThisP = true;
          }
        });

        let entire = $('#main-wrapper .entry').html();
        
        resolve({content:entire, img:img, title:o.title, sound: soundFile});

      });
    });
  })).then((result) => {

    console.log('Writing...');

    result.map((data, index) => {

      let onDisk = index + '-' + data.title.replace(/ /g, '-').replace(/:/g, '').replace(/&#x2018;/g, '').replace(/&#x2019;/g, '').toLowerCase();

      fs.writeFile('./data/content/' + onDisk + '.json', JSON.stringify(data, null, 2), (err)=> {
        if (err) throw err;
        console.log('Content moved to json file!');
      });

    });

  }).catch( (err) => {
    console.log(err);
  });

});


module.exports = router;