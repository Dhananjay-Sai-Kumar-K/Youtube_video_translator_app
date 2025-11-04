export const getHindiTranscript = async (videoId: string): Promise<string> => {
    try {
        // This service is unofficial. We first check if it lists a Hindi transcript for the video.
        const listApiUrl = `https://youtubetranscript.com/api/list-transcripts?video-id=${videoId}`;
        const listProxyUrl = `https://corsproxy.io/?${encodeURIComponent(listApiUrl)}`;
        
        const listResponse = await fetch(listProxyUrl);
        const listResponseText = await listResponse.text();

        // The proxy can return 200 OK even for a 404 from the target. Check content.
        if (!listResponse.ok || listResponseText.includes('<title>404 Not Found</title>')) {
             throw new Error("Could not retrieve the list of available transcripts for this video.");
        }
        
        let availableTranscripts;
        try {
            // The API returns an array of transcript objects
            availableTranscripts = JSON.parse(listResponseText);
        } catch (e) {
            console.error("Failed to parse transcript list:", listResponseText);
            throw new Error("The transcript service returned an invalid list of languages.");
        }

        // Check if a Hindi ('hi') transcript is listed.
        const hasHindiTranscript = availableTranscripts.some((transcript: any) => transcript.languageCode === 'hi');

        if (!hasHindiTranscript) {
            throw new Error("The service did not find an available Hindi transcript for this video. It may not exist or may not be accessible.");
        }

        // If Hindi is available, proceed to fetch the transcript content.
        const transcriptApiUrl = `https://youtubetranscript.com/api/transcript?video-id=${videoId}&lang=hi`;
        const transcriptProxyUrl = `https://corsproxy.io/?${encodeURIComponent(transcriptApiUrl)}`;
        
        const transcriptResponse = await fetch(transcriptProxyUrl);
        const transcriptResponseText = await transcriptResponse.text();
        
        if (!transcriptResponse.ok || transcriptResponseText.includes('<title>404 Not Found</title>')) {
             throw new Error("The service listed a Hindi transcript, but failed to retrieve its content.");
        }
        
        let transcriptData;
        try {
            transcriptData = JSON.parse(transcriptResponseText);
        } catch (e) {
            console.error("Failed to parse transcript content:", transcriptResponseText);
            throw new Error("The transcript API returned invalid data. The service might be temporarily unavailable.");
        }
        
        if (!transcriptData || !Array.isArray(transcriptData) || transcriptData.length === 0) {
            throw new Error("The fetched transcript is empty or invalid.");
        }

        // Combine all transcript parts into a single string.
        const fullTranscript = transcriptData.map((segment: { text: string }) => segment.text).join(' ');
        
        return fullTranscript;

    } catch (error) {
        console.error("Error fetching YouTube transcript:", error);
        if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
                 throw new Error('A network error occurred. Please check your connection and try again.');
            }
            // Re-throw the specific, user-friendly error messages from the try block.
            throw error; 
        }
        throw new Error("An unknown error occurred while fetching the transcript.");
    }
};