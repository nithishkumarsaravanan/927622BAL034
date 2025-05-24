const express = require('express');
const axios = require('axios');

const app = express();
const port = 9876;

const WINDOW_SIZE = 10;
const TIMEOUT_MS = 2000;

const numberTypeMap = {
  p: 'primes',
  f: 'fibo',
  e: 'even',
  r: 'rand'
};

const baseUrl = 'http://20.244.56.144/evaluation-service/';

const storedNumbers = {
  p: [],
  f: [],
  e: [],
  r: []
};

function uniqueConcat(oldArr, newArr) {
  const set = new Set(oldArr);
  newArr.forEach(n => set.add(n));
  return Array.from(set);
}

function limitWindow(arr) {
  if (arr.length <= WINDOW_SIZE) {
    return arr;
  }
  return arr.slice(arr.length - WINDOW_SIZE);
}

function average(arr) {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return parseFloat((sum / arr.length).toFixed(2));
}

app.get('/numbers/:numberid', async (req, res) => {
  let numberid = req.params.numberid;
  console.log(`Received request for numberid: '${numberid}'`);
  numberid = numberid.toLowerCase().trim();
  console.log(`Normalized numberid: '${numberid}'`);

  if (!numberTypeMap.hasOwnProperty(numberid)) {
    return res.status(400).json({ error: 'Invalid numberid. Use p, f, e, or r.' });
  }

  const prevState = [...storedNumbers[numberid]];

  try {
    const sourceUrl = baseUrl + numberTypeMap[numberid];
    console.log(`Fetching numbers from: ${sourceUrl}`);
    const response = await axios.get(sourceUrl, { timeout: TIMEOUT_MS });
    console.log('Response from third-party API:', response.data);

    if (!response.data || !Array.isArray(response.data.numbers)) {
      return res.status(502).json({ error: 'Invalid response from third-party API' });
    }

    const fetchedNumbers = response.data.numbers;

    let combined = uniqueConcat(storedNumbers[numberid], fetchedNumbers);
    console.log('Combined unique numbers:', combined);

    combined = limitWindow(combined);
    console.log('Limited to window size:', combined);

    storedNumbers[numberid] = combined;

    const avg = average(combined);
    console.log('Calculated average:', avg);

    res.json({
      windowPrevState: prevState,
      windowCurrstate: combined,
      numbers: fetchedNumbers,
      avg: avg
    });
  } catch (error) {
    console.error('Error fetching numbers:', error.message);
    console.error(error.stack);
    const avg = average(storedNumbers[numberid]);
    res.json({
      windowPrevState: prevState,
      windowCurrstate: storedNumbers[numberid],
      numbers: [],
      avg: avg
    });
  }
});

app.listen(port, () => {
  console.log(`Average Calculator microservice listening at http://localhost:${port}`);
});
