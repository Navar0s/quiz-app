import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import SoloQuiz from './SoloQuiz'; // Adjust path as necessary
import { API } from './api';

// Mock global.fetch
global.fetch = jest.fn();

// Mock useStopwatch hook as it's used internally by SoloQuiz
jest.mock('./hooks/useStopwatch', () => () => [0, jest.fn(), jest.fn(), jest.fn()]);

// Mock CustomAudioPlayer to avoid dealing with audio elements in this test
jest.mock('./components/CustomAudioPlayer', () => () => <div data-testid="mock-audio-player">Mock Audio Player</div>);


describe('SoloQuiz Data Fetching with Date Parameters', () => {
  const mockSongs = [{ _id: 's1', title: 'Song 1 filtered by date', category: 'Filme', audio: '/audio/s1.mp3', metadata: { Erscheinungsjahr: '2005' } }];

  beforeEach(() => {
    fetch.mockClear();
    // Default mock for successful song fetch
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockSongs,
    });
  });

  const renderQuizWithParams = (searchParams) => {
    const initialEntries = [`/solo?${searchParams}`];
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/solo" element={<SoloQuiz />} />
        </Routes>
      </MemoryRouter>
    );
  };

  test('fetches songs with startDate and endDate if present in URL', async () => {
    // Default fetch mock from beforeEach is sufficient if mockSongs is the expected response
    renderQuizWithParams('categories=Alle&count=10&startDate=2000&endDate=2010');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      const fetchCall = fetch.mock.calls[0][0];
      expect(fetchCall).toBe(`${API}/songs?startDate=2000&endDate=2010`);
    });

    // Check if the component tries to render based on the fetched songs
    // For example, look for the song title or the audio player
    await waitFor(() => {
        // Since QuizLayout and Card might be complex, we look for something simple from SoloQuiz's render path
        // This could be the "Kategorie: Alle Kategorien" text or part of it
        expect(screen.getByText(/Kategorie: Alle Kategorien/i)).toBeInTheDocument();
        // Or if a song is loaded, its title might appear, or the player
        // Depending on how SoloQuiz handles an empty list vs a list with one song.
        // If a song is loaded, CustomAudioPlayer should be rendered.
        expect(screen.getByTestId('mock-audio-player')).toBeInTheDocument();
    });
  });

  test('fetches songs without date parameters if not present in URL', async () => {
    // Default fetch mock from beforeEach is sufficient
    renderQuizWithParams('categories=Filme&count=5');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      const fetchCall = fetch.mock.calls[0][0];
      expect(fetchCall).toBe(`${API}/songs`); // No date params
    });
     await waitFor(() => {
        expect(screen.getByText(/Kategorie: Filme/i)).toBeInTheDocument();
        expect(screen.getByTestId('mock-audio-player')).toBeInTheDocument();
    });
  });

  test('handles empty song list from backend (e.g., no songs match date filter)', async () => {
    // Override default mock for this specific test case
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [], // Empty array for this specific test
    });
    renderQuizWithParams('categories=Alle&count=10&startDate=2023&endDate=2024');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe(`${API}/songs?startDate=2023&endDate=2024`);
    });

    // Check for "No songs found" message or similar
    await waitFor(() => {
      expect(screen.getByText(/Keine Songs für diese Auswahl gefunden/i)).toBeInTheDocument();
    });
  });
});
