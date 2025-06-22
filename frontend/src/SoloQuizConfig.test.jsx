import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SoloQuizConfig from './SoloQuizConfig'; // Adjust path as necessary
import { MemoryRouter } from 'react-router-dom';

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock fetch
global.fetch = jest.fn();

const mockSongsData = [
  { _id: 'f1', title: 'Film A', category: 'Filme', metadata: { Erscheinungsjahr: '2002' } },
  { _id: 's1', title: 'Serie A', category: 'Serien', metadata: { Startjahr: '2005', Endjahr: '2007' } }, // 2005-2007
  { _id: 'g1', title: 'Game A', category: 'Games', metadata: { Erscheinungsjahr: '2009' } },
  { _id: 'f2', title: 'Film B', category: 'Filme', metadata: { Erscheinungsjahr: '1998' } },
  { _id: 's2', title: 'Serie B', category: 'Serien', metadata: { Startjahr: '2001', Endjahr: '2004' } }, // 2001-2004
  { _id: 'g2', title: 'Game B', category: 'Games', metadata: { Erscheinungsjahr: '2011' } },
  { _id: 'f3', title: 'Film C', category: 'Filme', metadata: { Erscheinungsjahr: '2005' } },
  { _id: 's3', title: 'Serie C', category: 'Serien', metadata: { Startjahr: '2008', Endjahr: '2010' } }, // 2008-2010
  { _id: 'g3', title: 'Game C', category: 'Games', metadata: {} }, // No year
  { _id: 'f4', title: 'Film D', category: 'Filme', metadata: { Erscheinungsjahr: 'invalid' } }, // Invalid year
  { _id: 's4', title: 'Serie D', category: 'Serien', metadata: { Startjahr: '2000', Endjahr: '' } }, // Ongoing series 2000-current+100
  { _id: 'o1', title: 'Sonstiges A', category: 'Sonstiges', metadata: { Erscheinungsjahr: '2003' } }, // Not filtered by date
  { _id: 's5', title: 'Serie E', category: 'Serien', metadata: { Startjahr: '1995', Endjahr: '1999' } }, // 1995-1999
];
// Valid items for date filtering: f1, s1, g1, f2, s2, g2, f3, s3, s4, s5
// Total valid items: 10 (g3, f4, o1 are excluded by current date filter logic if a date range is applied,
// or by category filtering if 'Sonstiges' is not selected or if they don't have valid years)
// Initial available range from valid items: 1995 (s5) to 2011 (g2). Serie s4 (2000-ongoing) is also considered.
// Min Erscheinungsjahr/Startjahr: 1995. Max Erscheinungsjahr/Endjahr (excluding ongoing): 2011.


describe('SoloQuizConfig', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
    // Default mock for successful song fetch for most tests
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockSongsData,
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <SoloQuizConfig />
      </MemoryRouter>
    );
  };

  test('renders year inputs and determines available min/max years', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Min Jahr')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Max Jahr')).toBeInTheDocument();
    });

    // Min year from mockSongsData is 1998 (Song 4), Max year is 2011 (Song 6)
    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');

    await waitFor(() => {
        expect(minYearInput).toHaveValue(1998);
        expect(maxYearInput).toHaveValue(2011);
        // In SoloQuizConfig, the inputs are custom 'Input' components,
        // they might not directly expose 'min'/'max' attributes in the same way as native inputs.
        // We'll rely on the value being correctly set and the component's internal logic for range.
    });
  });

  test('updates selectedMinYear and selectedMaxYear on input change', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByPlaceholderText('Min Jahr')).toHaveValue(1998));

    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');

    fireEvent.change(minYearInput, { target: { value: '2000' } });
    expect(minYearInput).toHaveValue(2000);

    fireEvent.change(maxYearInput, { target: { value: '2008' } });
    expect(maxYearInput).toHaveValue(2008);
  });

  test('ensures selectedMinYear is not greater than selectedMaxYear (auto-adjustment)', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByPlaceholderText('Min Jahr')).toHaveValue(1998));

    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');

    fireEvent.change(minYearInput, { target: { value: '2009' } });
    expect(minYearInput).toHaveValue(2009);
    // maxYear (2011) should NOT change if newMin (2009) is not > currentMax (2011)
    // The logic is: if (selectedMaxYear && parseInt(newMinYear, 10) > parseInt(selectedMaxYear, 10)) { setSelectedMaxYear(newMinYear); }
    // Here 2009 is NOT > 2011. So selectedMaxYear (which was 2011 from mock data) should remain.
    expect(maxYearInput).toHaveValue(2011);


    // Reset for next check: Set min to 2000, max to 2005
    fireEvent.change(minYearInput, { target: { value: '2000' } });
    fireEvent.change(maxYearInput, { target: { value: '2005' } });
     await waitFor(() => {
        expect(minYearInput).toHaveValue(2000);
        expect(maxYearInput).toHaveValue(2005);
    });

    fireEvent.change(maxYearInput, { target: { value: '1999' } });
    expect(maxYearInput).toHaveValue(1999);
    expect(minYearInput).toHaveValue(1999); // minYear should adjust
  });

  test('Reset button sets years back to the full available range', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByPlaceholderText('Min Jahr')).toHaveValue(1998));

    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');

    fireEvent.change(minYearInput, { target: { value: '2001' } });
    fireEvent.change(maxYearInput, { target: { value: '2007' } });
    expect(minYearInput).toHaveValue(2001);
    expect(maxYearInput).toHaveValue(2007);

    const resetButton = screen.getByRole('button', { name: 'Reset' });
    fireEvent.click(resetButton);

    expect(minYearInput).toHaveValue(1998);
    expect(maxYearInput).toHaveValue(2011);
  });

  test('adds startDate and endDate to URL if filter is active and changed from default', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByPlaceholderText('Min Jahr')).toHaveValue(1998));

    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');

    fireEvent.change(minYearInput, { target: { value: '2000' } });
    fireEvent.change(maxYearInput, { target: { value: '2005' } });

    // Default mode is 'timetrial', default count is 5 (from TIME_TRIAL_NORMAL_COUNTS[0])
    // Default categories is 'Alle' (empty set)
    const startGameButton = screen.getByRole('button', { name: '🎬 Quiz Starten' });
    fireEvent.click(startGameButton);

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/solo?'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('mode=timetrial'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('count=5'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('categories=Alle'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('startDate=2000'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('endDate=2005'));
  });

  test('does NOT add startDate and endDate to URL if filter is at default full range', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByPlaceholderText('Min Jahr')).toHaveValue(1998));

    // Year inputs are already at default (1998-2011 for mock data)

    const startGameButton = screen.getByRole('button', { name: '🎬 Quiz Starten' });
    fireEvent.click(startGameButton);

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/solo?'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('mode=timetrial'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('count=5'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('categories=Alle'));
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('startDate='));
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('endDate='));
  });

  test('handles API error gracefully for year determination', async () => {
    fetch.mockReset(); // Clear default mock
    fetch.mockRejectedValueOnce(new Error('Solo API Error'));
    renderComponent();

    await waitFor(() => {
      // Check for the error message related to fetching song years
      expect(screen.getByText(/Fehler beim Laden der Song-Jahre: Solo API Error/i)).toBeInTheDocument();
    });

    const currentYear = new Date().getFullYear();
    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');

    // Based on current implementation, it falls back to currentYear - 20 to currentYear
    expect(minYearInput).toHaveValue(currentYear - 20);
    expect(maxYearInput).toHaveValue(currentYear);
    expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 0/i)).toBeInTheDocument(); // No songs loaded
  });

  test('handles empty song list from API for year determination and count', async () => {
    fetch.mockReset(); // Clear default mock
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [], // Empty array of songs
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Keine Songs gefunden, um den Jahresbereich zu bestimmen./i)).toBeInTheDocument();
    });

    const currentYear = new Date().getFullYear();
    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');

    // Fallback for empty songs is currentYear - 10 to currentYear in SoloQuizConfig
    expect(minYearInput).toHaveValue(currentYear-10);
    expect(maxYearInput).toHaveValue(currentYear);
    expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 0/i)).toBeInTheDocument();
  });

  // --- Tests for Filtered Song Count ---
  test('displays initial song count correctly (all songs matching default filters)', async () => {
    renderComponent(); // Uses default mockSongsData
    // Initially, selectedMin/MaxYear are set to availableMin/MaxYear from songs.
    // availableMinYear from mock: 1995, availableMaxYear: 2011 (Serie s4 2000-ongoing is handled by filter)
    // All 10 date-filterable songs (f1,s1,g1,f2,s2,g2,f3,s3,s4,s5) should be within this initial range.
    // g3 (no year), f4 (invalid year), o1 (Sonstiges) are not counted by the date filter logic.
    await waitFor(() => {
        expect(screen.getByPlaceholderText('Min Jahr')).toHaveValue(1995);
        expect(screen.getByPlaceholderText('Max Jahr')).toHaveValue(2011);
    });
    // Default: All categories, full date range of available songs.
    // Filter logic excludes songs not in Filme, Serien, Games for date filtering.
    // So, o1 is out. g3 and f4 are out due to invalid/missing year.
    // Expected: f1,s1,g1,f2,s2,g2,f3,s3,s4 (2000-current+100), s5. Total = 10
    expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument();
  });

  test('updates count when category filter changes', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());

    // Select "Filme" (categorySelectionMode is 'singleOrAll' by default for 'timetrial' mode)
    // 'Filme' in mock: f1(2002), f2(1998), f3(2005). f4 (invalid) is ignored. Total 3.
    fireEvent.click(screen.getByRole('button', { name: 'Filme' }));
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 3/i)).toBeInTheDocument());

    // Select "Serien"
    // 'Serien' in mock: s1(05-07), s2(01-04), s3(08-10), s4(00-ongoing), s5(95-99). Total 5.
    fireEvent.click(screen.getByRole('button', { name: 'Serien' }));
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 5/i)).toBeInTheDocument());

    // Select "Gemischt" (Alle)
    fireEvent.click(screen.getByRole('button', { name: 'Gemischt' }));
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());
  });

  test('updates count when date filter changes', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());

    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');

    // Range 2000-2003
    // f1 (2002), f2 (1998 NO), f3 (2005 NO)
    // s1 (05-07 NO), s2 (01-04 YES), s3 (08-10 NO), s4 (00-ongoing YES), s5 (95-99 NO)
    // g1 (2009 NO), g2 (2011 NO)
    // Expected: f1, s2, s4. Total 3.
    fireEvent.change(minYearInput, { target: { value: '2000' } });
    fireEvent.change(maxYearInput, { target: { value: '2003' } });
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 3/i)).toBeInTheDocument());

    // Range 2005-2009 (inclusive)
    // f1(NO), f3(YES)
    // s1(YES), s3(YES), s4(YES, ongoing from 2000)
    // g1(YES)
    // Expected: f3, s1, s3, s4, g1. Total 5.
    fireEvent.change(minYearInput, { target: { value: '2005' } });
    fireEvent.change(maxYearInput, { target: { value: '2009' } });
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 5/i)).toBeInTheDocument());
  });

  test('updates count with combined category and date filters', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());

    // Select "Filme"
    fireEvent.click(screen.getByRole('button', { name: 'Filme' }));
    // Filme: f1(2002), f2(1998), f3(2005). (f4 invalid)
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 3/i)).toBeInTheDocument());

    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');

    // Date range 2000-2004 for Filme
    // f1(2002 YES), f2(1998 NO), f3(2005 NO)
    // Expected: f1. Total 1.
    fireEvent.change(minYearInput, { target: { value: '2000' } });
    fireEvent.change(maxYearInput, { target: { value: '2004' } });
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 1/i)).toBeInTheDocument());
  });

  test('updates count correctly after date filter reset', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());

    const minYearInput = screen.getByPlaceholderText('Min Jahr');
    const maxYearInput = screen.getByPlaceholderText('Max Jahr');
    fireEvent.change(minYearInput, { target: { value: '2000' } });
    fireEvent.change(maxYearInput, { target: { value: '2003' } });
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 3/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    // Resets to full available range (1995-2011), all categories still selected by default ("Alle")
    // Expected: 10
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());
  });

   test('handles songs with invalid or missing year metadata gracefully in count', async () => {
    renderComponent(); // Uses mockSongsData which includes g3 (no year), f4 (invalid year), o1 (Sonstiges)
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 10/i)).toBeInTheDocument());
    // The count 10 means g3, f4, o1 were excluded by the default date filter logic.
    // The filtering logic returns false if year is NaN or category is not Filme/Serien/Games.
    // This test implicitly confirms they are not counted when a date filter is active (even default full range).

    // To be more explicit: select "Games" category
    // Games in mock: g1(2009), g2(2011), g3(no year).
    // With full date range (1995-2011), g1 and g2 should count. g3 should not.
    fireEvent.click(screen.getByRole('button', { name: 'Games' }));
    await waitFor(() => expect(screen.getByText(/Verfügbare Songs für aktuelle Auswahl: 2/i)).toBeInTheDocument());
  });

});
