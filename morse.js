'use strict';

/**
 * Returns the morse code equivalent of a text string.
 */
function morse(plaintext) {
	const code = { // Courtesy of http://svn.python.org/projects/python/trunk/Demo/scripts/morse.py
    'A': '.-',              'a': '.-',
    'B': '-...',            'b': '-...',
    'C': '-.-.',            'c': '-.-.',
    'D': '-..',             'd': '-..',
    'E': '.',               'e': '.',
    'F': '..-.',            'f': '..-.',
    'G': '--.',             'g': '--.',
    'H': '....',            'h': '....',
    'I': '..',              'i': '..',
    'J': '.---',            'j': '.---',
    'K': '-.-',             'k': '-.-',
    'L': '.-..',            'l': '.-..',
    'M': '--',              'm': '--',
    'N': '-.',              'n': '-.',
    'O': '---',             'o': '---',
    'P': '.--.',            'p': '.--.',
    'Q': '--.-',            'q': '--.-',
    'R': '.-.',             'r': '.-.',
    'S': '...',             's': '...',
    'T': '-',               't': '-',
    'U': '..-',             'u': '..-',
    'V': '...-',            'v': '...-',
    'W': '.--',             'w': '.--',
    'X': '-..-',            'x': '-..-',
    'Y': '-.--',            'y': '-.--',
    'Z': '--..',            'z': '--..',
    '0': '-----',           ',': '--..--',
    '1': '.----',           '.': '.-.-.-',
    '2': '..---',           '?': '..--..',
    '3': '...--',           ';': '-.-.-.',
    '4': '....-',           ':': '---...',
    '5': '.....',           "'": '.----.',
    '6': '-....',           '-': '-....-',
    '7': '--...',           '/': '-..-.',
    '8': '---..',           '(': '-.--.-',
    '9': '----.',           ')': '-.--.-',
                            '_': '..--.-',
    '+': '.-.-.' // Courtesy of http://foldoc.org/Morse+code
  }

  var output = '';
  for (let i = 0; i < plaintext.length; i++) {
    let character = plaintext.slice(i, i + 1);
    if (character in code) {
      output = output + code[character];
    }

    if (character === ' ') {
      output = output + ' ';
    }
  }
  return output;
}

function escapeRegExp(string) { // Courtesy of https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Port of Python `string.find()`.
 */
function find(s, sub, start = 0, end = undefined) {
  if (!s || !sub) {
    return -1;
  }

  return s.slice(start, end).search(escapeRegExp(sub));
}

/**
 * Find all the indices at which a substring begins inside a string,
 * including overlapping ones.
 */
function findAll(s, sub, result = [], start = 0) {
  var newLocation = find(s, sub, start);
  if (newLocation === -1) {
    return result;
  }

  result.push(newLocation + start);
  result = findAll(s, sub, result, newLocation + start + 1);
  return result;
}

function initializeWordList(words) {
  const wordList = {}
  const length = words.length;

  for (let i = 0; i < length; i++) {
    wordList[words[i]] = {};
  }

  return wordList;
}

function addTransformationsToWordList(wordList, transformations) {
  const length = wordList.length;

  for (let word in wordList) {
    wordList[word]['transformations'] = {};
    for (let transKey in transformations) {
      let trans = transformations[transKey];

      wordList[word]['transformations'][trans.description] = {
        morse: trans.transform(word)
      };
    }
  }
}

function addIndicesToWordList(wordList, puzzles) {
  for (let word in wordList) {
    for (let transformation in wordList[word]['transformations']) {
      wordList[word]['transformations'][transformation]['indices'] = [];
      for (let i = 0; i < puzzles.length; i++) {
        let indices = findAll(puzzles[i].ciphertext, wordList[word]['transformations'][transformation]['morse']);
        wordList[word]['transformations'][transformation]['indices'].push(indices);
      }
    }
  }
}

function deleteAbsentWordsFromWordList(wordList) {
  for (let word in wordList) {
    var deleteWord = true;

    for (let transformation in wordList[word]['transformations']) {
      if (wordList[word]['transformations'][transformation]['indices'] !== []) {
        deleteWord = false;
      }
    }

    if (deleteWord) {
      delete wordList[word];
    }
  }
}

function indicesTreeFromWordList(wordList) {
  const indicesTree = {};
  for (let word in wordList) {
    let data = wordList[word];

    for (let trans in data['transformations']) {
      if (!(trans in indicesTree)) {
        indicesTree[trans] = {};
      }

      for (let index in data['transformations'][trans]['indices']) {
        if (!(index in indicesTree[trans])) {
          indicesTree[trans][index] = [];
        }

        const length = wordList[word]['transformations'][trans]['morse'].length;
        indicesTree[trans][index].push({
          word: word,
          length: length,
          end: index + length
        });
      }
    }
  }
  return indicesTree;
}

function reverseIndicesTreeFromIndicesTree(indicesTree, puzzle) {
  const reverseIndicesTree = {};
  const length = puzzle.length;
  for (let index in indicesTree) {
    let words = indicesTree[index];
    for (let word in words) {
      let revIndex = length - word['end'];
      if(!(revIndex in reverseIndicesTree)) {
        reverseIndicesTree[revIndex] = [];
      }
      reverseIndicesTree[revIndex].push({
        word: word['word'],
        length: word['length'],
        end: length - index
      });
    }
  }
  return reverseIndicesTree;
}

function nextWordsFromWordList(wordList, transformation, startingIndex = 0, allowGaps = true) {
  const nextWordCandidates = [];
  for (let word in wordList) {
    for (let index in wordList[word].transformations[transformation]['indices']) {
      if (index < startingIndex) {
        continue;
      }
      nextWordCandidates.push({
        word: word,
        index: index,
        length: wordList[word].transformations['transformation'].morse.length
      });
    }
  }

  nextWordCandidates.sort((a, b) => {
    var comparison = a.index - b.index;

    if (comparison !== 0) {
      return comparison;
    }

    return a.length - b.length;
  });

  if (nextWordCandidates.length === 0) {
    return null;
  }

  const nextWords = [ nextWordCandidates[0] ];

  for (let i = 1; i < nextWordCandidates.length - 1; i++) {
    if (nextWordCandidates[i].index < nextWords[0].index + nextWords[0].length) {
      nextWords.push(nextWordCandidates[i]);
    }
  }

  return nextWords;
}

function nextWordsFromIndicesTree(indicesTree, transformation, puzzle, startingIndex = 0) {
  const nextWords = [];
  const puzzleLength = puzzle.length;

  while (!(startingIndex in indicesTree[transformation])) {
    startingIndex++;
    if (startingIndex >= puzzleLength) {
      return null;
    }
  }

  for (let word in indicesTree[transformation][startingIndex]) {
    let rword = word;
    rword.index = startingIndex;
    nextWords.append(rword);
  }

  return nextWords;
}

function allCombinationsFromWordList(wordList, transformation, resultTree = null) {
  if(resultTree === null) {
    resultTree = nextWordsFromWordList(wordList, transformation);
  }

  for (let word in resultTree) {
    let next = nextWordsFromWordList(wordList, transformation, word.index + word.length);

    if(next !== null) {
      word.next = allCombinationsFromWordList(wordList, transformation, next);
    } else {
      word.next = next;
    }
  }

  return resultTree;
}

function allCombinationsFromIndicesTree(indicesTree, transformation, puzzle, resultTree = null) {
  if(resultTree === null) {
    resultTree = nextWordsFromIndicesTree(indicesTree, transformation, puzzle)
  }

  for (let word in resultTree) {
    let next = nextWordsFromIndicesTree(indicesTree, transformation, puzzle, word.index + word.length);

    if(next !== null) {
      word.next = allCombinationsFromIndicesTree(indicesTree, transformation, puzzle, next);
    } else {
      word.next = next;
    }
  }

  return resultTree;
}

function flattenCombinations(resultTree, currentCombo = [], allCombos = []) {
  if(resultTree === null) {
    allCombos.push(currentCombo);
    return;
  }

  for (let word in resultTree) {
    let newCurrentCombo = currentCombo.slice();
    newCurrentCombo.push({
      word: word.word,
      index: word.index,
      length: word.length
    });
    flattenCombinations(word.next, newCurrentCombo, allCombos);
  }
  return allCombos;
}

async function getWordListFromFiles(filenames) {
  Promise.all(
    filenames.map(
      filename => {
        return fetch(`./words/${filename}.txt`)
          .then(response => response.text())
        ;
      }
    )
  ).then(results => {
    window.dispatchEvent(
      new CustomEvent('wordlistready', {
        detail: results.join("\n")
      })
    );
  });
}

window.addEventListener('wordlistready', start);

/*
function loadResults() {
  const names = [];
  const results = [];

  ['Dash at end', 'Dot at end'].forEach(ending => {
    ['forward letters', 'backward letters'].forEach(letters => {
      ['forward words', 'backward words'].forEach(words => {
        ['forward morse', 'backward morse'].forEach(morse => {
          const nameParts = [ending, letters, words, morse];
          names.push(nameParts.join(', '));
        });
      });
    });
  });

  names.forEach(async name => {
    const result = getFile(name);
    result.name = name;
    results.push(result);
  });

  return results;
}
*/
function getInitialPossibilities(result) {
  var possibilities = [];

  result['0'].forEach(wordData => {
    possibilities.push({
      sentenceSoFar: wordData.word,
      nextIndex: wordData.end,
      resultName: result.name
    });
  });

  return possibilities;
}

function getNextPossibilities(possibility, result) {
  const nextPossibilities = [];

  result[possibility.nextIndex].forEach(wordData => {
    nextPossibilities.push({
      sentenceSoFar: possibility.sentenceSoFar + ' ' + wordData.word,
      nextIndex: wordData.end,
      resultName: result.name
    });
  });

  return nextPossibilities;
}

function renderPossibility(possibility, resultName) {
  var el = document.createElement('li');
  el.setAttribute('data-result-name', resultName);
  el.setAttribute('data-sentence-so-far', possibility.sentenceSoFar);
  el.setAttribute('data-next-index', possibility.nextIndex);
  el.innerHTML = `<button class="eliminate" aria-label="Eliminate possibility">×</button> ${possibility.sentenceSoFar}</button>`;
  return el;
}

function init() {
  getWordListFromFiles(['1', 'custom']);
}

class Transformation {
  constructor(transform, description) {
    this.transform = transform;
    this.description = description;
  }
}

class Puzzle {
  constructor(ciphertext, description) {
    this.ciphertext = ciphertext;
    this.description = description;
  }
}

if(!String.prototype.reverse) {
  String.prototype.reverse = function() {
    return this.split('').reverse().join('');
  }
}

function logWordListSamples(wordList, numberOfSamples = 20) {
  const wordArray = Object.keys(wordList);
  const length = wordArray.length;
  const fraction = Math.floor(length / numberOfSamples);

  for (let sampleIndex = 0; sampleIndex <= numberOfSamples; sampleIndex++) {
    let wordIndex = sampleIndex * fraction;
    console.log(wordArray[wordIndex], wordList[wordArray[wordIndex]]);
  }
}

function start(e) {
  const wordArray = e.detail.split("\n");
  const wordList = initializeWordList(wordArray);

  const transformations = [
    new Transformation(x => morse(x), 'forward plaintext, forward morse'),
    new Transformation(x => morse(x).reverse(), 'forward plaintext, backward morse'),
    new Transformation(x => morse(x.reverse()), 'backward plaintext, forward morse'),
    new Transformation(x => morse(x.reverse()).reverse(), 'backward plaintext, backward morse')
  ];

  const puzzles = [
    new Puzzle('..-.---.-..-...--..--.-.--...--.-..-.-.---...--..-.--.-...--.-.---..-..--..-', 'dash at end'),
    new Puzzle('..-.---.-..-...--..--.-.--...--.-..-.-.---...--..-.--.-...--.-.---..-..--...', 'dot at end')
  ];

  console.log('addTransformationsToWordList');
  addTransformationsToWordList(wordList, transformations);

  console.log('addIndicesToWordList');
  addIndicesToWordList(wordList, puzzles);

  // logWordListSamples(wordList);





  /*
  const results = loadResults();

  results.forEach(result => {
    const section = document.createElement('section');
    section.setAttribute('data-result-name', result.name);
    section.innerHTML = `<h2>${result.name}</h2><ul></ul>`;
    const list = section.querySelector('ul');
    var possibilities = getInitialPossibilities(result);
    var nextPossibilities = [];
    possibilities.forEach(possibility => {
      nextPossibilities = nextPossibilities + getNextPossibilities(possibility, result);
    });

    nextPossibilities.forEach(function(possibility) {
      list.appendChild(renderPossibility(possibility, result.name));
    });

    console.log(section);

    document.querySelector('.possibilities').appendChild(section);
  });

  */
}

(() => {
  init();
})();
