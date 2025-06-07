import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GamemasterQuizConfig from './GamemasterQuizConfig'; // Adjust path as necessary
import { MemoryRouter } from 'react-router-dom'; // To provide routing context

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // import and retain default behavior
  useNavigate: () => mockNavigate, // override useNavigate
}));

// Mock the useTheme hook
jest.mock('./theme-context', () => ({
  useTheme: () => ({ theme: 'dark' }), // Provide a default theme
}));


// Mock fetch
global.fetch = jest.fn();

const mockSongsData = [
  { _id: '1', title: 'Song 1', category: 'Filme', metadata: { Erscheinungsjahr: '2000' } },
  { _id: '2', title: 'Song 2', category: 'Serien', metadata: { Startjahr: '2005', Endjahr: '2008' } },
  { _id: '3', title: 'Song 3', category: 'Games', metadata: { Erscheinungsjahr: '2010' } },
  { _id: '4', title: 'Song 4', category: 'Filme', metadata: { Erscheinungsjahr: '1995' } },
  { _id: '5', title: 'Song 5', category: 'Serien', metadata: { Startjahr: '2003', Endjahr: '2006' } },
  { _id: '6', title: 'Song 6', category: 'Games', metadata: { Erscheinungsjahr: '2012' } },
  { _id: '7', title: 'Song 7', category: 'Filme', metadata: {} }, // No year
  { _id: '8', title: 'Song 8', category: 'Serien', metadata: {Startjahr: 'NaN', Endjahr: 'NaN'} }, // Malformed
];


describe('GamemasterQuizConfig', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <GamemasterQuizConfig />
      </MemoryRouter>
    );
  };

  test('renders year inputs and determines available min/max years', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSongsData,
    });

    renderComponent();

    // Wait for API call and state updates
    await waitFor(() => {
      expect(screen.getByLabelText('Von:')).toBeInTheDocument();
      expect(screen.getByLabelText('Bis:')).toBeInTheDocument();
    });

    // Min year from mockSongsData is 1995 (Song 4), Max year is 2012 (Song 6)
    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');

    await waitFor(() => {
        expect(minYearInput).toHaveValue(1995);
        expect(maxYearInput).toHaveValue(2012);
        expect(minYearInput).toHaveAttribute('min', '1995');
        expect(maxYearInput).toHaveAttribute('max', '2012');
    });
  });

  test('updates selectedMinYear and selectedMaxYear on input change', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSongsData,
    });
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText('Von:')).toHaveValue(1995));

    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');

    fireEvent.change(minYearInput, { target: { value: '2001' } });
    expect(minYearInput).toHaveValue(2001);

    fireEvent.change(maxYearInput, { target: { value: '2009' } });
    expect(maxYearInput).toHaveValue(2009);
  });

  test('ensures selectedMinYear is not greater than selectedMaxYear (auto-adjustment)', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSongsData,
    });
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText('Von:')).toHaveValue(1995));

    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');

    // Set min year higher than max year
    fireEvent.change(minYearInput, { target: { value: '2010' } });
    expect(minYearInput).toHaveValue(2010);
    // maxYear (2012) should NOT change if newMin (2010) is not > currentMax (2012)
    // The logic is: if (selectedMaxYear && parseInt(newMinYear, 10) > parseInt(selectedMaxYear, 10)) { setSelectedMaxYear(newMinYear); }
    // Here 2010 is NOT > 2012. So selectedMaxYear (which was 2012 from mock data) should remain.
    expect(maxYearInput).toHaveValue(2012);


    // Reset for next check: Set min to 2000, max to 2005
    fireEvent.change(minYearInput, { target: { value: '2000' } });
    fireEvent.change(maxYearInput, { target: { value: '2005' } });
    await waitFor(() => { // Ensure state updates are processed
        expect(minYearInput).toHaveValue(2000);
        expect(maxYearInput).toHaveValue(2005);
    });

    // Set max year lower than min year
    fireEvent.change(maxYearInput, { target: { value: '1998' } });
    expect(maxYearInput).toHaveValue(1998);
    expect(minYearInput).toHaveValue(1998); // minYear should adjust
  });

  test('Reset button sets years back to the full available range', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSongsData,
    });
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText('Von:')).toHaveValue(1995));

    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');

    fireEvent.change(minYearInput, { target: { value: '2001' } });
    fireEvent.change(maxYearInput, { target: { value: '2008' } });
    expect(minYearInput).toHaveValue(2001);
    expect(maxYearInput).toHaveValue(2008);

    const resetButton = screen.getByRole('button', { name: 'Zurücksetzen' });
    fireEvent.click(resetButton);

    expect(minYearInput).toHaveValue(1995);
    expect(maxYearInput).toHaveValue(2012);
  });

  test('adds startDate and endDate to URL if filter is active and changed from default', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSongsData,
    });
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText('Von:')).toHaveValue(1995)); // Wait for load

    // Select a category to enable the button
    const categoryCheckbox = screen.getByLabelText('Filme'); // Assuming 'Filme' is a valid category
    fireEvent.click(categoryCheckbox);

    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');

    fireEvent.change(minYearInput, { target: { value: '2000' } });
    fireEvent.change(maxYearInput, { target: { value: '2005' } });

    const startGameButton = screen.getByRole('button', { name: '▶️ Spiel starten' });
    fireEvent.click(startGameButton);

    // Check navigate was called with correct params (default count is 10, category 'Filme')
    // Example: /gamemaster/play?categories=Filme&count=10&startDate=2000&endDate=2005
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('startDate=2000'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('endDate=2005'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('categories=Filme'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('count=10'));
  });

  test('does NOT add startDate and endDate to URL if filter is at default full range', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSongsData,
    });
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText('Von:')).toHaveValue(1995)); // Wait for load

    // Select a category to enable the button
    const categoryCheckbox = screen.getByLabelText('Serien');
    fireEvent.click(categoryCheckbox);

    // Ensure years are at default (1995-2012 for mock data)
    // (They are already at default after fetch)

    const startGameButton = screen.getByRole('button', { name: '▶️ Spiel starten' });
    fireEvent.click(startGameButton);

    // Check navigate was called without startDate and endDate (default count is 10, category 'Serien')
    // Example: /gamemaster/play?categories=Serien&count=10
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('categories=Serien'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('count=10'));
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('startDate='));
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('endDate='));
  });

  test('handles API error gracefully for year determination', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Fehler beim Laden der Song-Jahre: API Error/i)).toBeInTheDocument();
    });

    // Check if inputs fall back to a default or are disabled correctly
    // Based on current implementation, it falls back to currentYear - 20 to currentYear
    const currentYear = new Date().getFullYear();
    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');

    expect(minYearInput).toHaveValue(currentYear - 20);
    expect(maxYearInput).toHaveValue(currentYear);
  });

  test('handles empty song list from API for year determination', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [], // Empty array of songs
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Keine Songs gefunden, um den Jahresbereich zu bestimmen./i)).toBeInTheDocument();
    });

    // Check if inputs fall back to current year or are handled
    const currentYear = new Date().getFullYear();
    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');
    expect(minYearInput).toHaveValue(currentYear);
    expect(maxYearInput).toHaveValue(currentYear);
  });

});
