import React, { useState, useEffect, useRef, useCallback } from 'react';
import { translateHindiToTamil, generateTamilSpeech } from './services/geminiService';
import { getHindiTranscript } from './services/youtubeService';

// Define YT types globally to avoid TypeScript errors
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const YouTubeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-gray-600">
      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816Zm-10.615 12.816V8l5.8 3.5-5.8 3.5Z" />
    </svg>
);


const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path fillRule="evenodd" d="M6.75 5.25A.75.75 0 0 1 7.5 6v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0A.75.75 0 0 1 16.5 6v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);


const App: React.FC = () => {
    const [youtubeUrl, setYoutubeUrl] = useState<string>('');
    const [videoId, setVideoId] = useState<string | null>(null);
    const [fetchedTranscript, setFetchedTranscript] = useState<string>('');
    const [isFetchingTranscript, setIsFetchingTranscript] = useState<boolean>(false);
    const [transcriptError, setTranscriptError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [translatedAudioUrl, setTranslatedAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    const playerRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const ytApiLoaded = useRef(false);

    const loadYouTubeApi = useCallback(() => {
        if (ytApiLoaded.current) return;
        ytApiLoaded.current = true;
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = () => {};
    }, []);

    useEffect(() => {
        loadYouTubeApi();
    }, [loadYouTubeApi]);
    
    useEffect(() => {
        if (!videoId || !window.YT) return;
        if (playerRef.current) playerRef.current.destroy();
        playerRef.current = new window.YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { playsinline: 1, mute: 1, controls: 0, modestbranding: 1, rel: 0 },
        });
        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [videoId]);

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setYoutubeUrl(url);
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);

        // Reset all states related to the video and translation
        setTranslatedAudioUrl(null);
        setIsPlaying(false);
        setError(null);
        setStatusMessage('');
        setFetchedTranscript('');
        setTranscriptError(null);
        
        setVideoId(match ? match[1] : null);
    };

    useEffect(() => {
        if (!videoId) return;

        const fetchTranscript = async () => {
            setIsFetchingTranscript(true);
            setTranscriptError(null);
            setFetchedTranscript('');
            try {
                const transcript = await getHindiTranscript(videoId);
                setFetchedTranscript(transcript);
                setStatusMessage("Transcript fetched successfully.");
            } catch (err) {
                setTranscriptError(err instanceof Error ? err.message : 'An unknown error occurred.');
                setStatusMessage('');
            } finally {
                setIsFetchingTranscript(false);
            }
        };
        fetchTranscript();
    }, [videoId]);

    const handleSubmit = async () => {
        if (!fetchedTranscript.trim() || !videoId) {
            setError("Cannot proceed without a transcript. Please provide a video with an available Hindi transcript.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setTranslatedAudioUrl(null);
        setIsPlaying(false);

        try {
            setStatusMessage("Translating Hindi transcript to Tamil...");
            const tamilText = await translateHindiToTamil(fetchedTranscript);

            setStatusMessage("Generating Tamil audio from translated text...");
            const base64Audio = await generateTamilSpeech(tamilText);
            const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
            setTranslatedAudioUrl(audioUrl);

            setStatusMessage("Translation complete. Ready to play.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            setStatusMessage('');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePlayPause = () => {
        if (!playerRef.current || !audioRef.current) return;

        if (isPlaying) {
            playerRef.current.pauseVideo();
            audioRef.current.pause();
        } else {
            // Synchronize before playing
            const videoTime = playerRef.current.getCurrentTime();
            if (Math.abs(audioRef.current.currentTime - videoTime) > 0.5) {
                audioRef.current.currentTime = videoTime;
            }
            playerRef.current.playVideo();
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
            <header className="w-full max-w-4xl text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    YouTube Video Translator
                </h1>
                <p className="mt-2 text-gray-400">
                    Translate Hindi audio to Tamil and watch with synchronized playback.
                </p>
            </header>

            <main className="w-full max-w-4xl bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col space-y-6">
                    <div>
                        <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-300 mb-2">1. YouTube Video URL</label>
                        <input
                            type="text"
                            id="youtubeUrl"
                            value={youtubeUrl}
                            onChange={handleUrlChange}
                            placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                        />
                    </div>
                    <div>
                        <label htmlFor="transcript" className="block text-sm font-medium text-gray-300 mb-2">2. Extracted Hindi Transcript</label>
                        <div id="transcript" className="w-full h-48 p-3 bg-gray-700 border border-gray-600 rounded-lg overflow-y-auto text-sm scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
                            {isFetchingTranscript && (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span>Fetching transcript...</span>
                                </div>
                            )}
                            {transcriptError && <p className="text-red-400 p-2">{transcriptError}</p>}
                            {fetchedTranscript && <p className="text-gray-200 whitespace-pre-wrap">{fetchedTranscript}</p>}
                            {!videoId && !isFetchingTranscript && !transcriptError && !fetchedTranscript && (
                                <p className="text-gray-500 flex items-center justify-center h-full">Enter a video URL to fetch its transcript.</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || isFetchingTranscript || !fetchedTranscript}
                        className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : 'Generate Translated Audio'}
                    </button>
                    {statusMessage && <p className="text-center text-sm text-gray-400 mt-2">{statusMessage}</p>}
                    {error && <p className="text-center text-sm text-red-400 mt-2">{error}</p>}
                </div>

                <div className="flex flex-col items-center justify-center bg-gray-900 rounded-lg overflow-hidden min-h-[250px] lg:min-h-full">
                    {videoId ? (
                        <div className="w-full aspect-video relative">
                             <div id="youtube-player" className="absolute top-0 left-0 w-full h-full"></div>
                             {translatedAudioUrl && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                    <button onClick={handlePlayPause} className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-opacity">
                                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                    </button>
                                </div>
                             )}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 p-8 flex flex-col items-center space-y-2">
                            <YouTubeIcon />
                            <p>Video player will appear here.</p>
                        </div>
                    )}
                </div>
            </main>
            {translatedAudioUrl && (
                <audio ref={audioRef} src={translatedAudioUrl} className="hidden"></audio>
            )}
        </div>
    );
};

export default App;
