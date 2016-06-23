'use strict';

var Twit = require('twit');
var T = new Twit(require('./config.js'));
var _ = require('underscore');
_.mixin( require('underscore.deferred') );
var markov = require('markov');

var Trending = function () {
    this.m = markov(2);
};
 
Trending.prototype.generateTrendingTopicTweet = function () {
    var that = this;
    // Get a trending topic
    this.getRandomTrend().then(function(trend) {
        console.log('Trend: ' + trend.query);
        return that.searchTopic(trend.query);        
    }).then(function(corpus) {
        console.log('Seeding'); 
        that.seedMarkov(that.filterText(corpus)); 
    }).then(function() {
        // Generate response 
        var response = that.generateMarkov(4);
        console.log('Response: ' + response);
        that.postTweet(response);
    });
};

Trending.prototype.postTweet = function(tweet) {
    T.post('statuses/update', { status: tweet }, function(err, reply) {
        if (err) {
            console.log('Error:', err);
        }
        else {
            console.log('Reply:', reply);
        }
    });
}

Trending.prototype.getRandomTrend = function() {
    var dfd = new _.Deferred();
    T.get('trends/place', { id: '2464592' }, function(err, data, response) {
        var trends = data[0].trends;
        var trend = _.sample(trends);
        dfd.resolve(trend);
    });
    return dfd.promise();
}

Trending.prototype.searchTopic = function (topic) {
    var dfd = new _.Deferred();
    T.get('search/tweets', { q: topic, lang: 'en', count: 100 }, function(err, reply) {
        if (err) {
            dfd.reject(err);
        }
        
        var corpus;
        reply.statuses.forEach(function(o) { corpus += o.text + ' '; });
        
        dfd.resolve(corpus);
    });
    return dfd.promise();
};

Trending.prototype.filterText = function (text) {
    // Remove a list of keywords from the string
    var keywords = ['RT', '#', '@', 'http'];
    keywords.forEach(function(kw) { var re = new RegExp(kw + '[^\\s]*', 'g'); text = text.replace(re, ''); });
    
    // Remove all non-alphanumeric
    //text = text.replace(/\W+/g, ' ');
    
    return text;
};

Trending.prototype.seedMarkov = function (seed) {
    var dfd = new _.Deferred();
    this.m.seed(seed, function() {
        dfd.resolve();
    });  
    return dfd.promise();
};

Trending.prototype.generateMarkov = function (limit) {
    limit = limit || (3 + Math.floor(3 * Math.random()));
    var res = this.m.forward(this.m.pick(), limit).join(' ');
    res = res.charAt(0).toUpperCase() + res.substr(1); 
    return res;  
};

module.exports = new Trending();