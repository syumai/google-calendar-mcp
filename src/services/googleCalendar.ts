import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GaxiosError } from 'gaxios';
import {
    ListEventsArgumentsSchema,
    SearchEventsArgumentsSchema,
    CreateEventArgumentsSchema,
    UpdateEventArgumentsSchema,
    DeleteEventArgumentsSchema,
} from '../schemas/validators.ts';
import { z } from 'zod';

// Helper function to handle common GaxiosError for invalid grant
function handleGoogleApiError(error: unknown): void {
    if (error instanceof GaxiosError && error.response?.data?.error === 'invalid_grant') {
        throw new Error('Google API Error: Authentication token is invalid or expired. Please re-run the authentication process (e.g., `npm run auth`).');
    }
    // Re-throw other errors
    throw error;
}

/**
 * Lists all available calendars.
 */
export async function listCalendars(client: OAuth2Client): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    try {
        const calendar = google.calendar({ version: 'v3', auth: client });
        const response = await calendar.calendarList.list();
        return response.data.items || [];
    } catch (error) {
        handleGoogleApiError(error);
        throw error;
    }
}

/**
 * Lists events from a specific calendar.
 */
export async function listEvents(
    client: OAuth2Client, 
    args: z.infer<typeof ListEventsArgumentsSchema>
): Promise<calendar_v3.Schema$Event[]> {
    try {
        const calendar = google.calendar({ version: 'v3', auth: client });
        const response = await calendar.events.list({
            calendarId: args.calendarId,
            timeMin: args.timeMin,
            timeMax: args.timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return response.data.items || [];
    } catch (error) {
        handleGoogleApiError(error);
        throw error;
    }
}

/**
 * Searches for events in a specific calendar based on a query.
 */
export async function searchEvents(
    client: OAuth2Client, 
    args: z.infer<typeof SearchEventsArgumentsSchema>
): Promise<calendar_v3.Schema$Event[]> {
    try {
        const calendar = google.calendar({ version: 'v3', auth: client });
        const response = await calendar.events.list({
            calendarId: args.calendarId,
            q: args.query,
            timeMin: args.timeMin,
            timeMax: args.timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return response.data.items || [];
    } catch (error) {
        handleGoogleApiError(error);
        throw error;
    }
}

/**
 * Lists available event colors.
 */
export async function listColors(client: OAuth2Client): Promise<calendar_v3.Schema$Colors> {
    try {
        const calendar = google.calendar({ version: 'v3', auth: client });
        const response = await calendar.colors.get();
        if (!response.data) throw new Error('Failed to retrieve colors');
        return response.data;
    } catch (error) {
        handleGoogleApiError(error);
        throw error;
    }
}

/**
 * Creates a new calendar event.
 */
export async function createEvent(
    client: OAuth2Client, 
    args: z.infer<typeof CreateEventArgumentsSchema>
): Promise<calendar_v3.Schema$Event> {
    try {
        const calendar = google.calendar({ version: 'v3', auth: client });
        const requestBody: calendar_v3.Schema$Event = {
            summary: args.summary,
            description: args.description,
            start: { dateTime: args.start, timeZone: args.timeZone },
            end: { dateTime: args.end, timeZone: args.timeZone },
            attendees: args.attendees,
            location: args.location,
            colorId: args.colorId,
            reminders: args.reminders,
            recurrence: args.recurrence,
        };
        const response = await calendar.events.insert({
            calendarId: args.calendarId,
            requestBody: requestBody,
        });
        if (!response.data) throw new Error('Failed to create event, no data returned');
        return response.data;
    } catch (error) {
        handleGoogleApiError(error);
        throw error;
    }
}

/**
 * Updates an existing calendar event.
 */
export async function updateEvent(
    client: OAuth2Client, 
    args: z.infer<typeof UpdateEventArgumentsSchema>
): Promise<calendar_v3.Schema$Event> {
    try {
        const calendar = google.calendar({ version: 'v3', auth: client });
        const requestBody: calendar_v3.Schema$Event = {};
        if (args.summary !== undefined) requestBody.summary = args.summary;
        if (args.description !== undefined) requestBody.description = args.description;
        
        let timeChanged = false;
        if (args.start !== undefined) {
            requestBody.start = { dateTime: args.start, timeZone: args.timeZone };
            timeChanged = true;
        }
        if (args.end !== undefined) {
            requestBody.end = { dateTime: args.end, timeZone: args.timeZone };
            timeChanged = true;
        }
        
        // If start or end was changed, ensure both objects exist and have the timezone.
        // Also apply timezone if it's the only time-related field provided (for recurring events)
        if (timeChanged || (!args.start && !args.end && args.timeZone)) {
            if (!requestBody.start) requestBody.start = {};
            if (!requestBody.end) requestBody.end = {};
            // Only add timezone if not already added via dateTime object creation above
            if (!requestBody.start.timeZone) requestBody.start.timeZone = args.timeZone;
            if (!requestBody.end.timeZone) requestBody.end.timeZone = args.timeZone; 
        } 

        if (args.attendees !== undefined) requestBody.attendees = args.attendees;
        if (args.location !== undefined) requestBody.location = args.location;
        if (args.colorId !== undefined) requestBody.colorId = args.colorId;
        if (args.reminders !== undefined) requestBody.reminders = args.reminders;
        if (args.recurrence !== undefined) requestBody.recurrence = args.recurrence;

        const response = await calendar.events.patch({
            calendarId: args.calendarId,
            eventId: args.eventId,
            requestBody: requestBody,
        });
        if (!response.data) throw new Error('Failed to update event, no data returned');
        return response.data;
    } catch (error) {
        handleGoogleApiError(error);
        throw error;
    }
}

/**
 * Deletes a calendar event.
 */
export async function deleteEvent(
    client: OAuth2Client, 
    args: z.infer<typeof DeleteEventArgumentsSchema>
): Promise<void> {
    try {
        const calendar = google.calendar({ version: 'v3', auth: client });
        await calendar.events.delete({
            calendarId: args.calendarId,
            eventId: args.eventId,
        });
    } catch (error) {
        handleGoogleApiError(error);
    }
} 