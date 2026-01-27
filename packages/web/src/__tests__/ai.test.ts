
import { generateDiagram } from '../services/ai';
import { useSettingsStore } from '../store/settingsStore';

// Mock the settings store
jest.mock('../store/settingsStore', () => ({
    useSettingsStore: {
        getState: jest.fn(),
    },
}));

// Mock GoogleGenAI
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
            generateContent: mockGenerateContent
        }
    }))
}));

describe('AI Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useSettingsStore.getState as jest.Mock).mockReturnValue({
            apiKey: 'test-key',
            apiProvider: 'gemini'
        });
    });

    test('generateDiagram creates correct prompt for Paper', async () => {
        mockGenerateContent.mockResolvedValue({ text: 'Updated Paper Content' });

        await generateDiagram('Add section', '# Intro', 'paper');

        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            contents: expect.stringContaining('Task: Update this based on the request')
        }));
    });

    test('generateDiagram creates correct prompt for Diagram', async () => {
        mockGenerateContent.mockResolvedValue({ text: '{"nodes": []}' });

        await generateDiagram('Add node', '{}', 'diagram');

        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            contents: expect.stringContaining('Task: Update this based on the request')
        }));
    });
});
