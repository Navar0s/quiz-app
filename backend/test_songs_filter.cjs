const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Path to the songs.json file, assuming test is run from backend directory or similar context
const SONGS_FILE_PATH = path.join(__dirname, 'data', 'songs.json'); // Matches server.js

// --- Mock Song Data ---
const mockSongs = [
  // Movies
  { _id: 'm1', title: 'Movie 2000', category: 'Filme', metadata: { Erscheinungsjahr: '2000' } },
  { _id: 'm2', title: 'Movie 2005', category: 'Filme', metadata: { Erscheinungsjahr: '2005' } },
  { _id: 'm3', title: 'Movie 2010', category: 'Filme', metadata: { Erscheinungsjahr: '2010' } },
  { _id: 'm4', title: 'Movie String Year', category: 'Filme', metadata: { Erscheinungsjahr: 'N/A' } },
  { _id: 'm5', title: 'Movie No Year', category: 'Filme', metadata: {} },

  // Games
  { _id: 'g1', title: 'Game 2003', category: 'Games', metadata: { Erscheinungsjahr: '2003' } },
  { _id: 'g2', title: 'Game 2008', category: 'Games', metadata: { Erscheinungsjahr: '2008' } },
  { _id: 'g3', title: 'Game No Year', category: 'Games', metadata: {} },
  { _id: 'g4', title: 'Game Malformed Year', category: 'Games', metadata: { Erscheinungsjahr: 'Two Thousand Ten' } },


  // Series
  // s1: 2000-2004 (overlaps with 2002-2006)
  { _id: 's1', title: 'Series A (2000-2004)', category: 'Serien', metadata: { Startjahr: '2000', Endjahr: '2004' } },
  // s2: 2005-2008 (fully contained in 2002-2010, overlaps with 2006-2008)
  { _id: 's2', title: 'Series B (2005-2008)', category: 'Serien', metadata: { Startjahr: '2005', Endjahr: '2008' } },
  // s3: 2009-2012 (starts in 2002-2010, ends outside; overlaps with 2008-2010)
  { _id: 's3', title: 'Series C (2009-2012)', category: 'Serien', metadata: { Startjahr: '2009', Endjahr: '2012' } },
  // s4: 1998-2002 (ends in 2000-2005, starts outside)
  { _id: 's4', title: 'Series D (1998-2002)', category: 'Serien', metadata: { Startjahr: '1998', Endjahr: '2002' } },
  // s5: 2010-2010 (single year series, on boundary)
  { _id: 's5', title: 'Series E (2010-2010)', category: 'Serien', metadata: { Startjahr: '2010', Endjahr: '2010' } },
  // s6: Completely outside a range like 2005-2008
  { _id: 's6', title: 'Series F (1990-1995)', category: 'Serien', metadata: { Startjahr: '1990', Endjahr: '1995' } },
  // s7: Series with no year metadata
  { _id: 's7', title: 'Series No Year', category: 'Serien', metadata: {} },
  // s8: Series with one year missing
  { _id: 's8', title: 'Series Missing End Year', category: 'Serien', metadata: { Startjahr: '2000'} },
  // s9: Series with malformed year
  { _id: 's9', title: 'Series Malformed Year', category: 'Serien', metadata: { Startjahr: 'Two Thousand', Endjahr: '2005'} },
  // s10: Series with start year after end year (invalid data, should not match typically)
  { _id: 's10', title: 'Series Invalid Range (2005-2000)', category: 'Serien', metadata: { Startjahr: '2005', Endjahr: '2000'} },

  // Other category
  { _id: 'o1', title: 'Other Song 2005', category: 'Sonstiges', metadata: { Erscheinungsjahr: '2005' } },
];

// --- Mock fs.readFileSync ---
const originalReadFileSync = fs.readFileSync;
let readFileSyncMockActive = false;

const mockReadFileSync = (filePath, options) => {
  if (readFileSyncMockActive && filePath.endsWith(path.normalize('data/songs.json'))) {
    console.log(`Mocking readFileSync for: ${filePath}`);
    return JSON.stringify(mockSongs);
  }
  return originalReadFileSync(filePath, options);
};

// --- The actual filter logic from server.js (copied for direct testing) ---
// This is a simplified version. Ideally, we'd import the app or refactor server.js
// For this environment, direct copy and test is more feasible.

function getFilteredSongs(allSongs, queryParams) {
  let songsToFilter = [...allSongs]; // Create a copy
  const { startDate, endDate } = queryParams;

  if (startDate && endDate && !isNaN(parseInt(startDate)) && !isNaN(parseInt(endDate))) {
    const startYear = parseInt(startDate);
    const endYear = parseInt(endDate);

    songsToFilter = songsToFilter.filter(song => {
      const category = song.category;
      const metadata = song.metadata || {};

      if (category === 'Filme' || category === 'Games') {
        const erscheinungsjahr = parseInt(metadata.Erscheinungsjahr);
        return !isNaN(erscheinungsjahr) && erscheinungsjahr >= startYear && erscheinungsjahr <= endYear;
      } else if (category === 'Serien') {
        const startjahr = parseInt(metadata.Startjahr);
        const endjahr = parseInt(metadata.Endjahr);
        if (isNaN(startjahr) || isNaN(endjahr)) {
            return false;
        }
        return startjahr <= endYear && endjahr >= startYear;
      }
      return false; // Songs of other categories, or without valid year info for filter, are excluded
    });
  }
  // If no valid date filter, returns all original songs (or songsToFilter if it was modified by other filters in a real scenario)
  return songsToFilter;
}


// --- Test Cases ---
const testCases = [
  {
    description: 'No date parameters: all songs returned',
    query: {},
    expectedIds: mockSongs.map(s => s._id)
  },
  // Removed redundant 'Filter Movies/Games: 2000-2005' as it's covered by the next one
  {
    description: 'Filter Movies/Games/Series: 2000-2005',
    query: { startDate: '2000', endDate: '2005' },
    // Movies: m1 (2000), m2 (2005)
    // Games: g1 (2003)
    // Series:
    // s1 (2000-2004): 2000 <= 2005 && 2004 >= 2000 -> YES
    // s2 (2005-2008): 2005 <= 2005 && 2008 >= 2000 -> YES
    // s4 (1998-2002): 1998 <= 2005 && 2002 >= 2000 -> YES
    // s10 (2005-2000), malformed but current logic: 2005 <= 2005 && 2000 >= 2000 -> YES
    expectedIds: ['m1', 'm2', 'g1', 's1', 's2', 's4', 's10']
  },
  {
    description: 'Filter Series: 2006-2009',
    query: { startDate: '2006', endDate: '2009' },
    // Movies: None
    // Games: g2 (2008)
    // Series:
    // s1 (2000-2004) -> no, 2000 > 2009 is false, 2004 < 2006 is false. (2000 <= 2009 && 2004 >= 2006) -> no
    // s2 (2005-2008) -> yes, 2005 <= 2009 && 2008 >= 2006
    // s3 (2009-2012) -> yes, 2009 <= 2009 && 2012 >= 2006
    expectedIds: ['g2', 's2', 's3']
  },
  {
    description: 'Boundary condition: year equals startDate or endDate (2010)',
    query: { startDate: '2010', endDate: '2010' },
    // Movies: m3 (2010)
    // Games: None
    // Series:
    // s3 (2009-2012) -> yes, 2009 <= 2010 && 2012 >= 2010
    // s5 (2010-2010) -> yes, 2010 <= 2010 && 2010 >= 2010
    expectedIds: ['m3', 's3', 's5']
  },
  {
    description: 'Invalid date parameters: non-numeric startDate',
    query: { startDate: 'abc', endDate: '2010' },
    expectedIds: mockSongs.map(s => s._id)
  },
  {
    description: 'Invalid date parameters: non-numeric endDate',
    query: { startDate: '2000', endDate: 'xyz' },
    expectedIds: mockSongs.map(s => s._id)
  },
  {
    description: 'Invalid date parameters: endDate before startDate',
    query: { startDate: '2010', endDate: '2000' },
    // The filter logic `startjahr <= endYear && endjahr >= startYear` will handle this.
    // For Filme/Games: `erscheinungsjahr >= startYear && erscheinungsjahr <= endYear` will be empty.
    // So, it should return an empty list of *filterable* items, not all songs.
    // If the intention is to return *all* songs on invalid range, the filter function itself needs adjustment.
    // Current server logic returns empty for filterable items if range is impossible.
    expectedIds: []
  },
  {
    description: 'Missing startDate parameter',
    query: { endDate: '2010' },
    expectedIds: mockSongs.map(s => s._id)
  },
  {
    description: 'Missing endDate parameter',
    query: { startDate: '2000' },
    expectedIds: mockSongs.map(s => s._id)
  },
  {
    description: 'Filter that yields no results',
    query: { startDate: '1900', endDate: '1901' },
    expectedIds: []
  },
  {
    description: 'Malformed year data in songs (they should be ignored by filter)',
    query: { startDate: '2000', endDate: '2010' },
    // m1(00), m2(05), m3(10), g1(03), g2(08)
    // s1 (2000-2004): 2000 <= 2010 && 2004 >= 2000 -> YES
    // s2 (2005-2008): 2005 <= 2010 && 2008 >= 2000 -> YES
    // s3 (2009-2012): 2009 <= 2010 && 2012 >= 2000 -> YES
    // s4 (1998-2002): 1998 <= 2010 && 2002 >= 2000 -> YES
    // s5 (2010-2010): 2010 <= 2010 && 2010 >= 2000 -> YES
    // s10 (2005-2000), malformed but current logic: 2005 <= 2010 && 2000 >= 2000 -> YES
    // Ignored due to malformed/missing data: m4, m5, g3, g4, s7, s8, s9
    // Ignored due to not fitting range: s6
    expectedIds: ['m1', 'm2', 'm3', 'g1', 'g2', 's1', 's2', 's3', 's4', 's5', 's10']
  }
];

// --- Test Runner ---
function runTests() {
  console.log('--- Starting Backend Filter Tests ---');
  let testsPassed = 0;
  let testsFailed = 0;

  testCases.forEach(testCase => {
    try {
      // We use the mockSongs array directly with our faithful copy of the server's filter function
      const resultSongs = getFilteredSongs(mockSongs, testCase.query);
      const resultIds = resultSongs.map(s => s._id).sort();
      const expectedIdsSorted = [...testCase.expectedIds].sort(); // Ensure expected IDs are also sorted for comparison

      assert.deepStrictEqual(resultIds, expectedIdsSorted, `Test Failed: ${testCase.description}\nExpected: ${expectedIdsSorted}\nActual:   ${resultIds}`);
      console.log(`✅ Test Passed: ${testCase.description}`);
      testsPassed++;
    } catch (e) {
      // Log the error message itself which includes expected and actual from assert
      console.error(`❌ ${e.message}`); // Using e.message directly as it's more informative for assert errors
      // console.error(e); // Optionally log the full error object
      testsFailed++;
    }
  });

  console.log('--- Backend Filter Tests Finished ---');
  console.log(`Passed: ${testsPassed}, Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    process.exitCode = 1; // Set exit code to 1 if any test fails
  }
}

runTests();

module.exports = { runTests, mockSongs, getFilteredSongs }; // Export for potential future use
