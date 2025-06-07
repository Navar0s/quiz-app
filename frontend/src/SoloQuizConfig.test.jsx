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
  { _id: '1', title: 'Song 1', category: 'Filme', metadata: { Erscheinungsjahr: '2002' } },
  { _id: '2', title: 'Song 2', category: 'Serien', metadata: { Startjahr: '2005', Endjahr: '2007' } },
  { _id: '3', title: 'Song 3', category: 'Games', metadata: { Erscheinungsjahr: '2009' } },
  { _id: '4', title: 'Song 4', category: 'Filme', metadata: { Erscheinungsjahr: '1998' } },
  { _id: '5', title: 'Song 5', category: 'Serien', metadata: { Startjahr: '2001', Endjahr: '2004' } },
  { _id: '6', title: 'Song 6', category: 'Games', metadata: { Erscheinungsjahr: '2011' } },
];


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
  });

  test('handles empty song list from API for year determination', async () => {
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
  });

});
