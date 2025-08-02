/**
 * CommandOutputFormatter Tests
 * Tests for progress indicators, output modes, summary formatting, and error formatting
 */

import { CommandOutputFormatter, OutputOptions, ProgressState, CommandSummary } from '../../../src/utils/command-output-formatter';
import ora from 'ora';
import chalk from 'chalk';

// Mock ora spinner
jest.mock('ora');
const mockOra = ora as jest.MockedFunction<typeof ora>;

describe('CommandOutputFormatter', () => {
  let formatter: CommandOutputFormatter;
  let mockSpinner: any;
  
  beforeEach(() => {
    // Reset chalk colors for testing
    chalk.level = 1;
    
    // Mock spinner object
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      text: '',
      color: 'cyan',
      stop: jest.fn().mockReturnThis(),
      clear: jest.fn().mockReturnThis()
    };
    
    mockOra.mockReturnValue(mockSpinner);
    
    formatter = new CommandOutputFormatter({
      silent: false,
      verbose: false,
      json: false
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor and options', () => {
    it('should initialize with default options', () => {
      const defaultFormatter = new CommandOutputFormatter();
      expect(defaultFormatter).toBeInstanceOf(CommandOutputFormatter);
    });

    it('should initialize with custom options', () => {
      const options: OutputOptions = {
        silent: true,
        verbose: true,
        json: true
      };
      const customFormatter = new CommandOutputFormatter(options);
      expect(customFormatter).toBeInstanceOf(CommandOutputFormatter);
    });
  });

  describe('progress indicators', () => {
    describe('startProgress', () => {
      it('should start spinner with message when not silent', () => {
        formatter.startProgress('Processing files');
        
        expect(mockOra).toHaveBeenCalledWith({
          text: 'Processing files',
          color: 'cyan'
        });
        expect(mockSpinner.start).toHaveBeenCalled();
      });

      it('should not start spinner when silent', () => {
        const silentFormatter = new CommandOutputFormatter({ silent: true });
        silentFormatter.startProgress('Processing files');
        
        expect(mockOra).not.toHaveBeenCalled();
      });

      it('should not start spinner when json mode', () => {
        const jsonFormatter = new CommandOutputFormatter({ json: true });
        jsonFormatter.startProgress('Processing files');
        
        expect(mockOra).not.toHaveBeenCalled();
      });
    });

    describe('updateProgress', () => {
      beforeEach(() => {
        formatter.startProgress('Initial message');
      });

      it('should update spinner text when active', () => {
        formatter.updateProgress('Updated message');
        expect(mockSpinner.text).toBe('Updated message');
      });

      it('should not update when no active spinner', () => {
        const newFormatter = new CommandOutputFormatter();
        expect(() => newFormatter.updateProgress('test')).not.toThrow();
      });
    });

    describe('completeProgress', () => {
      beforeEach(() => {
        formatter.startProgress('Processing');
      });

      it('should complete spinner with success message', () => {
        formatter.completeProgress('Task completed successfully');
        
        expect(mockSpinner.succeed).toHaveBeenCalledWith('Task completed successfully');
      });

      it('should clear internal spinner reference', () => {
        formatter.completeProgress('Done');
        formatter.updateProgress('Should not crash');
        // Should not throw error
      });
    });

    describe('failProgress', () => {
      beforeEach(() => {
        formatter.startProgress('Processing');
      });

      it('should fail spinner with error message', () => {
        formatter.failProgress('Task failed');
        
        expect(mockSpinner.fail).toHaveBeenCalledWith('Task failed');
      });

      it('should clear internal spinner reference', () => {
        formatter.failProgress('Failed');
        formatter.updateProgress('Should not crash');
        // Should not throw error
      });
    });
  });

  describe('output modes', () => {
    describe('normal mode', () => {
      it('should output regular messages', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        formatter.info('Information message');
        formatter.success('Success message');
        formatter.warning('Warning message');
        formatter.error('Error message');
        
        expect(consoleSpy).toHaveBeenCalledTimes(3); // info, success, warning
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // error
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });
    });

    describe('silent mode', () => {
      let silentFormatter: CommandOutputFormatter;
      
      beforeEach(() => {
        silentFormatter = new CommandOutputFormatter({ silent: true });
      });

      it('should not output info, success, or warning messages', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        silentFormatter.info('Information message');
        silentFormatter.success('Success message');
        silentFormatter.warning('Warning message');
        
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should still output error messages', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        silentFormatter.error('Error message');
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error message'));
        consoleErrorSpy.mockRestore();
      });
    });

    describe('verbose mode', () => {
      let verboseFormatter: CommandOutputFormatter;
      
      beforeEach(() => {
        verboseFormatter = new CommandOutputFormatter({ verbose: true });
      });

      it('should output detailed logs', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        verboseFormatter.debug('Debug message');
        verboseFormatter.verbose('Verbose message');
        
        expect(consoleSpy).toHaveBeenCalledTimes(2);
        consoleSpy.mockRestore();
      });

      it('should include timestamps in verbose output', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        verboseFormatter.verbose('Test message');
        
        const call = consoleSpy.mock.calls[0][0];
        expect(call).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
        consoleSpy.mockRestore();
      });
    });

    describe('json mode', () => {
      let jsonFormatter: CommandOutputFormatter;
      
      beforeEach(() => {
        jsonFormatter = new CommandOutputFormatter({ json: true });
      });

      it('should output valid JSON for structured data', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        const data = { name: 'test', status: 'success', count: 5 };
        jsonFormatter.json(data);
        
        expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
        consoleSpy.mockRestore();
      });

      it('should not output non-JSON messages in json mode', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        jsonFormatter.info('Regular message');
        jsonFormatter.success('Success message');
        
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });

  describe('summary formatting', () => {
    const mockSummary: CommandSummary = {
      command: 'deploy',
      startTime: new Date('2023-01-01T10:00:00Z'),
      endTime: new Date('2023-01-01T10:00:05Z'),
      duration: 5000,
      success: true,
      stats: {
        processed: 10,
        succeeded: 8,
        failed: 2,
        skipped: 0
      },
      details: {
        files: ['file1.js', 'file2.ts'],
        errors: ['Error in file3.js']
      }
    };

    it('should format summary with statistics and duration', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      formatter.summary(mockSummary);
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('deploy');
      expect(output).toContain('5.0s');
      expect(output).toContain('processed:');
      expect(output).toContain('10');
      expect(output).toContain('succeeded:');
      expect(output).toContain('8');
      expect(output).toContain('failed:');
      expect(output).toContain('2');
      
      consoleSpy.mockRestore();
    });

    it('should show different colors for success vs failure', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const failureSummary = { ...mockSummary, success: false };
      
      formatter.summary(mockSummary);
      formatter.summary(failureSummary);
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('completed');
      expect(output).toContain('failed');
      
      consoleSpy.mockRestore();
    });

    it('should include verbose details when verbose mode is on', () => {
      const verboseFormatter = new CommandOutputFormatter({ verbose: true });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      verboseFormatter.summary(mockSummary);
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('file1.js');
      expect(output).toContain('Error in file3.js');
      
      consoleSpy.mockRestore();
    });

    it('should output JSON format in json mode', () => {
      const jsonFormatter = new CommandOutputFormatter({ json: true });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      jsonFormatter.summary(mockSummary);
      
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockSummary, null, 2));
      consoleSpy.mockRestore();
    });
  });

  describe('error formatting', () => {
    it('should format simple error messages', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      formatter.error('Simple error message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Simple error message'));
      consoleErrorSpy.mockRestore();
    });

    it('should format Error objects with stack traces in verbose mode', () => {
      const verboseFormatter = new CommandOutputFormatter({ verbose: true });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const error = new Error('Test error');
      verboseFormatter.error(error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const calls = consoleErrorSpy.mock.calls.map(call => call[0]).join('\n');
      expect(calls).toContain('Test error');
      expect(calls).toContain('Stack trace:');
      
      consoleErrorSpy.mockRestore();
    });

    it('should format Error objects without stack traces in normal mode', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const error = new Error('Test error');
      formatter.error(error);
      
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('Test error');
      expect(call).not.toContain('Stack trace:');
      
      consoleErrorSpy.mockRestore();
    });

    it('should output error as JSON in json mode', () => {
      const jsonFormatter = new CommandOutputFormatter({ json: true });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const error = new Error('Test error');
      jsonFormatter.error(error);
      
      const call = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.error).toBe('Test error');
      expect(parsed.level).toBe('error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('color coding', () => {
    it('should use green for success messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      formatter.success('Success message');
      
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('\u001b[32m'); // ANSI green color code
      
      consoleSpy.mockRestore();
    });

    it('should use red for error messages', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      formatter.error('Error message');
      
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('\u001b[31m'); // ANSI red color code
      
      consoleErrorSpy.mockRestore();
    });

    it('should use yellow for warning messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      formatter.warning('Warning message');
      
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('\u001b[33m'); // ANSI yellow color code
      
      consoleSpy.mockRestore();
    });

    it('should not use colors when colors are disabled', () => {
      // Simulate no color support
      const originalLevel = chalk.level;
      chalk.level = 0;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      formatter.success('Success message');
      
      const call = consoleSpy.mock.calls[0][0];
      expect(call).not.toContain('\u001b[32m'); // No ANSI codes
      
      consoleSpy.mockRestore();
      chalk.level = originalLevel;
    });
  });

  describe('progress state management', () => {
    it('should track progress state correctly', () => {
      expect(formatter.getProgressState()).toBe(ProgressState.NONE);
      
      formatter.startProgress('Testing');
      expect(formatter.getProgressState()).toBe(ProgressState.ACTIVE);
      
      formatter.completeProgress('Done');
      expect(formatter.getProgressState()).toBe(ProgressState.COMPLETED);
      
      formatter.startProgress('Testing again');
      formatter.failProgress('Failed');
      expect(formatter.getProgressState()).toBe(ProgressState.FAILED);
    });
  });

  describe('utility methods', () => {
    it('should format duration correctly', () => {
      expect(formatter.formatDuration(1000)).toBe('1.0s');
      expect(formatter.formatDuration(1500)).toBe('1.5s');
      expect(formatter.formatDuration(60000)).toBe('1m 0.0s');
      expect(formatter.formatDuration(90500)).toBe('1m 30.5s');
      expect(formatter.formatDuration(3661000)).toBe('1h 1m 1.0s');
    });

    it('should format timestamps correctly', () => {
      const date = new Date('2023-01-01T12:30:45Z');
      const formatted = formatter.formatTimestamp(date);
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });
  });
});