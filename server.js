var express = require('express');
var app = express();

var Twit = require('twit');
var T = new Twit(require('./config.js'));

var _ = require('underscore');
_.mixin( require('underscore.deferred') );

var trending = require('./trending.js');

app.set('port', (process.env.PORT || 5000))

var MAX_RT_PER_RUN = 1;
var RtThisRun = 0;

function generateTrendingTopicTweet() {
    trending.generateTrendingTopicTweet();
} 

// Search for terms relating to contests
function search(term) {
    RtThisRun = 0
    console.log('Search: ' + JSON.stringify(term));
    T.get('search/tweets', { q: term, count: 10 }, function(err, reply) {
        if (err) {
            return err;
        }
        
        var tweets = reply.statuses;
        tweets.forEach(function(o) { checkStatus(o) });
    });
}

function checkStatus(s) {
    if (RtThisRun >= MAX_RT_PER_RUN) {
        return;
    }
    
    // Get actual RT
    var rts = s.retweeted_status
    if (!rts) {
        return;
    }
    
    // Should be retweeted more than threshold
    var rtcThreshold = 100;
    if (rts.retweet_count < rtcThreshold) {
        console.log('Count ' + rts.retweet_count + ' less than threshold'); 
        return;
    }
    
    var hasKeywords = _.find(['RT', 'Retweet', 'Follow'], function(kw) { return rts.text.toLowerCase().indexOf(kw.toLowerCase()) > -1 });
    if (!hasKeywords) {
        console.log(rts.text + '\nDoes not contain RT keywords');
        return;
    }
    
    var blacklist = _.find(['pinned','ticket'], function(kw) { return rts.text.toLowerCase().indexOf(kw.toLowerCase()) > -1 });
    if (blacklist) {
        console.log(rts.text + '\nContains blacklisted word ' + blacklist.toUpperCase());
        return;    
    }
    
    // Todo: Weight randomness based on criteria like number of RT, keywords, etc.
    
    // If not retweeted, retweet
    if (!rts.retweeted) {
        // RT
        console.log('RT ' + rts.id_str + ': ' + rts.text);
        T.post('statuses/retweet/:id', { id: rts.id_str }, function (err, data, response) {
            if (err) {
                console.error(err);
                return;
            }
            
            console.log('RT Success');
        });
    }
    
    // If not following, follow
    if (!rts.user.following) {
        // Follow
        console.log('Follow ' + rts.user.screen_name);
        T.post('friendships/create', { id: rts.user.id }, function (err, data, response) {
            console.log('Follow Success');
        });
    }
    
    RtThisRun++;
}

setInterval(function() {
    try {
        search("rt to win");
    }
    catch (e) {
        console.error(e);
    }

}, 1000 * 60 * 60);

app.get('/', function (req, res) {
    res.send("Running");
})

app.get('/search', function (req, res) {
    var term = req.query.q || '';
    res.send(search(term));
})

app.get('/tweet', function (req, res) {
    var tweet = generateTrendingTopicTweet();
    res.send(tweet);
})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
