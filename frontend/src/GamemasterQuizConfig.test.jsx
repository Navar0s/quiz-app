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

// Using the same diverse mock data as in SoloQuizConfig.test.jsx for consistency
const mockSongsData = [
  { _id: 'f1', title: 'Film A', category: 'Filme', metadata: { Erscheinungsjahr: '2002' } },
  { _id: 's1', title: 'Serie A', category: 'Serien', metadata: { Startjahr: '2005', Endjahr: '2007' } },
  { _id: 'g1', title: 'Game A', category: 'Games', metadata: { Erscheinungsjahr: '2009' } },
  { _id: 'f2', title: 'Film B', category: 'Filme', metadata: { Erscheinungsjahr: '1998' } },
  { _id: 's2', title: 'Serie B', category: 'Serien', metadata: { Startjahr: '2001', Endjahr: '2004' } },
  { _id: 'g2', title: 'Game B', category: 'Games', metadata: { Erscheinungsjahr: '2011' } },
  { _id: 'f3', title: 'Film C', category: 'Filme', metadata: { Erscheinungsjahr: '2005' } },
  { _id: 's3', title: 'Serie C', category: 'Serien', metadata: { Startjahr: '2008', Endjahr: '2010' } },
  { _id: 'g3', title: 'Game C', category: 'Games', metadata: {} }, // No year
  { _id: 'f4', title: 'Film D', category: 'Filme', metadata: { Erscheinungsjahr: 'invalid' } }, // Invalid year
  { _id: 's4', title: 'Serie D', category: 'Serien', metadata: { Startjahr: '2000', Endjahr: '' } }, // Ongoing series
  { _id: 'o1', title: 'Sonstiges A', category: 'Sonstiges', metadata: { Erscheinungsjahr: '2003' } },
  { _id: 's5', title: 'Serie E', category: 'Serien', metadata: { Startjahr: '1995', Endjahr: '1999' } },
];
// Initial available range from valid items: 1995 (s5) to 2011 (g2).


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
    const currentYear = new Date().getFullYear();
    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');

    expect(minYearInput).toHaveValue(currentYear - 20);
    expect(maxYearInput).toHaveValue(currentYear);
    expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 0/i)).toBeInTheDocument();
  });

  test('handles empty song list from API for year determination and count', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [], // Empty array of songs
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Keine Songs gefunden, um den Jahresbereich zu bestimmen./i)).toBeInTheDocument();
    });

    const currentYear = new Date().getFullYear();
    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');
    expect(minYearInput).toHaveValue(currentYear);
    expect(maxYearInput).toHaveValue(currentYear);
    expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 0/i)).toBeInTheDocument();
  });

  // --- Tests for Filtered Song Count ---
  test('displays initial song count correctly (all songs matching default filters)', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockSongsData });
    renderComponent();
    // availableMinYear from mock: 1995, availableMaxYear: 2011
    await waitFor(() => {
        expect(screen.getByLabelText('Von:')).toHaveValue(1995);
        expect(screen.getByLabelText('Bis:')).toHaveValue(2011);
    });
    // Default: No categories selected, full date range of available songs.
    // Count logic: if categories.length === 0, it means all categories.
    // Filter logic excludes songs not in Filme, Serien, Games for date filtering.
    // So, o1 is out. g3 and f4 are out due to invalid/missing year.
    // Expected: f1,s1,g1,f2,s2,g2,f3,s3,s4,s5. Total = 10.
    expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument();
  });

  test('updates count when category filter changes', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockSongsData });
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());

    // Select "Filme"
    // Filme in mock: f1(2002), f2(1998), f3(2005). (f4 invalid is ignored). Total 3.
    fireEvent.click(screen.getByLabelText('Filme'));
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 3/i)).toBeInTheDocument());

    // Add "Serien"
    // Serien: s1(05-07), s2(01-04), s3(08-10), s4(00-ongoing), s5(95-99). Total 5.
    // Total Filme + Serien = 3 + 5 = 8
    fireEvent.click(screen.getByLabelText('Serien'));
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 8/i)).toBeInTheDocument());

    // Deselect "Filme"
    // Only Serien selected. Total 5.
    fireEvent.click(screen.getByLabelText('Filme'));
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 5/i)).toBeInTheDocument());
  });

  test('updates count when date filter changes', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockSongsData });
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());

    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');

    // Range 2000-2003. No categories selected, so all are considered.
    // f1(2002 YES), f2(1998 NO)
    // s2(01-04 YES), s4(00-ongoing YES)
    // Expected: f1, s2, s4. Total 3.
    fireEvent.change(minYearInput, { target: { value: '2000' } });
    fireEvent.change(maxYearInput, { target: { value: '2003' } });
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 3/i)).toBeInTheDocument());
  });

  test('updates count with combined category and date filters', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockSongsData });
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());

    // Select "Games"
    // Games: g1(2009), g2(2011). (g3 no year). Total 2.
    fireEvent.click(screen.getByLabelText('Games'));
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 2/i)).toBeInTheDocument());

    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');

    // Date range 2010-2012 for Games
    // g1(2009 NO), g2(2011 YES)
    // Expected: g2. Total 1.
    fireEvent.change(minYearInput, { target: { value: '2010' } });
    fireEvent.change(maxYearInput, { target: { value: '2012' } });
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 1/i)).toBeInTheDocument());
  });

  test('updates count correctly after date filter reset', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockSongsData });
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());

    // Select "Serien"
    // Serien: s1, s2, s3, s4, s5. Total 5.
    fireEvent.click(screen.getByLabelText('Serien'));
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 5/i)).toBeInTheDocument());

    const minYearInput = screen.getByLabelText('Von:');
    const maxYearInput = screen.getByLabelText('Bis:');
    // Date range 2005-2008 for Serien
    // s1(05-07 YES), s2(01-04 NO), s3(08-10 YES), s4(00-ongoing YES)
    // Expected: s1, s3, s4. Total 3.
    fireEvent.change(minYearInput, { target: { value: '2005' } });
    fireEvent.change(maxYearInput, { target: { value: '2008' } });
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 3/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }));
    // Resets date to full available range (1995-2011). "Serien" category still selected.
    // Expected: 5 (all series).
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 5/i)).toBeInTheDocument());
  });

  test('handles songs with invalid or missing year metadata gracefully in count', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockSongsData });
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());
    // This count of 10 (for all categories, full date range) already means g3, f4, o1 were excluded by date filter logic.

    // Select "Games"
    fireEvent.click(screen.getByLabelText('Games'));
    // Games in mock: g1(2009), g2(2011), g3(no year).
    // With full date range (1995-2011), g1 and g2 should count. g3 should not. Total 2.
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 2/i)).toBeInTheDocument());

    // Select "Filme" (deselect "Games")
    fireEvent.click(screen.getByLabelText('Games')); // deselect
    fireEvent.click(screen.getByLabelText('Filme'));
    // Filme: f1(2002), f2(1998), f3(2005). f4(invalid year) is ignored. Total 3.
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 3/i)).toBeInTheDocument());
  });

});
