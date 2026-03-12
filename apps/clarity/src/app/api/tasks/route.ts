import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from '@/lib/supabase';
import PostHogClient from '@/lib/posthog';

// Initialize the Google Gen AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PM_CATEGORIES = ['unblock', 'strategy', 'stakeholders', 'ops'];
const PRIORITIES = ['high', 'medium', 'low'];

export async function POST(req: Request) {
    try {
        const { taskText } = await req.json();

        if (!taskText || typeof taskText !== 'string' || taskText.trim().length === 0) {
            return NextResponse.json({ error: 'Task text is required' }, { status: 400 });
        }

        if (taskText.length > 500) {
            return NextResponse.json({ error: 'Task text is too long (max 500 characters)' }, { status: 400 });
        }

        // Call Gemini 2.5 Flash to categorize
        const startTime = Date.now();
        const prompt = `You are an expert Product Manager assistant.
Your job is to categorize a raw thought or task from a busy PM into a structured format.

The input task is: "${taskText}"

Categories (choose EXACTLY ONE):
- unblock: Urgent engineering/design blockers, bugs blocking releases, test failures.
- strategy: Roadmaps, PRDs, deep work, vision, market research, analytics deep dives.
- stakeholders: Communications, updates, syncs with sales, marketing, support, leadership.
- ops: Minor bugs, Jira hygiene, backlog grooming, repetitive chores, minor docs.

Priorities (choose EXACTLY ONE):
- high: Do today. Blocking others or critical.
- medium: Do this week. Important but not blocking right now.
- low: Do later. Nice to have.

Title:
Clean up the raw thought into a concise, professional task title (e.g., "Review Q3 roadmap with Sarah" instead of "Need to review the Q3 roadmap with Sarah tomorrow").`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: {
                            type: Type.STRING,
                            description: "One of: unblock, strategy, stakeholders, ops",
                            enum: ['unblock', 'strategy', 'stakeholders', 'ops']
                        },
                        priority: {
                            type: Type.STRING,
                            description: "One of: high, medium, low",
                            enum: ['high', 'medium', 'low']
                        },
                        title: {
                            type: Type.STRING,
                            description: "Cleaned up task title"
                        }
                    },
                    required: ["category", "priority", "title"]
                }
            }
        });

        const resultText = response.text;
        let result: any = null;
        let isFallback = false;

        if (resultText) {
            try {
                // Safe parse: strip markdown codeblocks if Gemini hallucinated them
                const cleanText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                result = JSON.parse(cleanText);

                // Validate the AI response
                if (
                    !PM_CATEGORIES.includes(result.category) ||
                    !PRIORITIES.includes(result.priority) ||
                    !result.title
                ) {
                    console.error("Invalid AI categorization:", result);
                    isFallback = true;
                }
            } catch (e) {
                console.error("Failed to parse Gemini JSON:", resultText);
                isFallback = true;
            }
        } else {
            console.error("No response text from Gemini");
            isFallback = true;
        }

        // Apply fallback if necessary to prevent data loss
        if (isFallback) {
            result = {
                category: 'ops',
                priority: 'medium',
                title: `[Review Needed] ${taskText.substring(0, 30)}...`
            };
        }

        // Save to Supabase
        const { data, error } = await supabase
            .from('tasks')
            .insert({
                raw_input: taskText,
                title: result.title,
                category: result.category,
                priority: result.priority,
                status: 'todo',
            })
            .select()
            .single();

        if (error) {
            console.error('Database Error:', error);
            throw new Error('Failed to save task to database.');
        }

        const endTime = Date.now();
        const latency = endTime - startTime;

        // Log telemetry
        const ph = PostHogClient();
        if (isFallback) {
            ph.capture({
                distinctId: 'anonymous_user', // Will add auth later
                event: 'ai_fallback_triggered',
                properties: { input_length: taskText.length }
            });
        } else {
            ph.capture({
                distinctId: 'anonymous_user',
                event: 'task_categorized',
                properties: {
                    category: result.category,
                    priority: result.priority,
                    ai_latency_ms: latency,
                    task_id: data.id
                }
            });
        }
        await ph.shutdown();

        return NextResponse.json({ success: true, task: data });
    } catch (error) {
        console.error('Error processing task:', error);
        return NextResponse.json(
            { error: 'Failed to process task' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            throw error;
        }

        return NextResponse.json({ tasks: data });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const { status } = await req.json();

        if (status !== 'done' && status !== 'todo') {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('tasks')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Database Error:', error);
            throw new Error('Failed to update task.');
        }

        return NextResponse.json({ success: true, task: data });
    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json(
            { error: 'Failed to update task' },
            { status: 500 }
        );
    }
}
