import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import GamemasterQuiz from './GamemasterQuiz'; // Adjust path as necessary
import { API } from './api';

// Mock global.fetch
global.fetch = jest.fn();

// Mock useTheme hook
jest.mock('./theme-context', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

describe('GamemasterQuiz Data Fetching with Date Parameters', () => {
  const mockSongs = [{ _id: 'gm1', title: 'GM Song 1', category: 'Filme', file: '/audio/gm1.mp3', metadata: { Erscheinungsjahr: '2007' } }];

  beforeEach(() => {
    fetch.mockClear();
    // Default mock for successful song fetch
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockSongs,
    });
  });

  const renderQuizWithParams = (searchParams) => {
    const initialEntries = [`/gamemaster/play?${searchParams}`]; // Path for GamemasterQuiz
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/gamemaster/play" element={<GamemasterQuiz />} />
        </Routes>
      </MemoryRouter>
    );
  };

  test('fetches songs with startDate and endDate if present in URL', async () => {
    // Default fetch mock from beforeEach is sufficient
    renderQuizWithParams('categories=Filme&count=1&startDate=2005&endDate=2008');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      const fetchCall = fetch.mock.calls[0][0];
      // GamemasterQuiz also filters by categories client-side, but sends date to backend
      expect(fetchCall).toBe(`${API}/songs?startDate=2005&endDate=2008`);
    });

    // Check if the component tries to render based on the fetched songs
    await waitFor(() => {
        // Example: Check for the question count display or song title
        expect(screen.getByText(/Frage 1 von 1/i)).toBeInTheDocument();
        expect(screen.getByText(/GM Song 1/i)).toBeInTheDocument(); // Check for song title
    });
  });

  test('fetches songs without date parameters if not present in URL', async () => {
    // Default fetch mock from beforeEach is sufficient
    renderQuizWithParams('categories=Filme&count=1');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      const fetchCall = fetch.mock.calls[0][0];
      expect(fetchCall).toBe(`${API}/songs`); // No date params
    });
    await waitFor(() => {
        expect(screen.getByText(/Frage 1 von 1/i)).toBeInTheDocument();
        expect(screen.getByText(/GM Song 1/i)).toBeInTheDocument();
    });
  });

  test('handles empty song list from backend (e.g., no songs match date filter)', async () => {
    // Override default mock for this specific test case
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [], // Empty array for this specific test
    });
    renderQuizWithParams('categories=Games&count=5&startDate=2023&endDate=2024');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe(`${API}/songs?startDate=2023&endDate=2024`);
    });

    // Check for "Alle Songs abgespielt" or similar, as current index might exceed songs.length
    // Or, if an error message is set:
    // await waitFor(() => {
    //   expect(screen.getByText(/Fehler beim Laden der Songs/i)).toBeInTheDocument();
    // });
    // Based on GamemasterQuiz, if songs array is empty, current >= songs.length will be true.
    // It will show "Runde abgeschlossen!"
    await waitFor(() => {
        expect(screen.getByText(/Runde abgeschlossen!/i)).toBeInTheDocument();
    });
  });

  test('uses API constant for audio source', async () => {
    // Default fetch mock from beforeEach is sufficient
    renderQuizWithParams('categories=Filme&count=1');

    await waitFor(() => {
      const audioPlayer = screen.getByRole('audio');
      expect(audioPlayer).toHaveAttribute('src', `${API}/audio/gm1.mp3`);
    });
  });

});
