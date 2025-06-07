module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mocks CSS imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js', // Mocks file imports
    // If you use path aliases in your webpack/vite config (e.g., @components/*), configure them here too.
    // Example: '^@components/(.*)$': '<rootDir>/src/components/$1',
  },
  // Indicates whether each individual test should be reported during the run.
  verbose: true,
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/src'],
};
