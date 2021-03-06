const twit = require('twit');
const fs = require('fs');
const config = require('./config.json');
const conjugate = require('./conjugator').get;
const { default: axios } = require('axios');

const T = new twit(config);
const list = fs.readFileSync('./list.txt', { encoding: 'utf-8' }).split('\n');
let { line } = JSON.parse(fs.readFileSync('./save.json', { encoding: 'utf-8' }));

async function tweet() {
  let conjugated;
  let verb;
  while (!conjugated) {
    verb = list[line++];
    conjugated = await conjugate(verb);
    if (!conjugated)
      console.log(`${verb} couldn't be conjugated.`);
  }
  conjugated = conjugated.replace('’', '\'');
  const phrase = `Chérie, ${conjugated} les gosses`;
  fs.writeFileSync('./save.json', `{"line":${line}}`, { encoding: 'utf-8' });
  return new Promise(function (resolve, reject) {
    T.post('statuses/update', { status: phrase }, async function (_err, tw, _res) {
      console.log(`Sent tweet with verb '${verb}'`);
      try {
        const link = `https://fr.wiktionary.org/wiki/${verb}`;
        await axios.get(encodeURI(link));
        T.post('statuses/update', { status: link, in_reply_to_status_id: tw.id_str }, function (_err, tw, _res) {
          console.log('Replied with Wiktionary link');
        });
      } catch (err) {
        console.log('Couldn\'t find Wiktionary link for this verb');
      }
      resolve();
    });
  });
}

let nextTweet = new Date();
if (nextTweet.getMinutes() >= 30) {
  nextTweet.setTime(nextTweet.getTime() + 1800 * 1000)
  nextTweet.setMinutes(0, 0, 0);
} else {
  nextTweet.setMinutes(30, 0, 0);
}

console.log(`Launched. Next tweet at: ${nextTweet}`);

setTimeout(async function () {
  await tweet();
  setInterval(tweet, 1800 * 1000);
}, nextTweet.getTime() - Date.now());