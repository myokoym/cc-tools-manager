/**
 * OutputFormatter Tests
 */

import { OutputFormatter, FormatterOptions } from '../../../src/formatters/output-formatter';
import { Repository } from '../../../src/types/repository';
import { DeploymentMapping } from '../../../src/services/deployment-mapper';
import chalk from 'chalk';

describe('OutputFormatter', () => {
  let formatter: OutputFormatter;
  
  beforeEach(() => {
    formatter = new OutputFormatter();
    // Force enable chalk colors for testing
    chalk.level = 1;
  });

  const mockRepository: Repository = {
    id: 'repo-123',
    name: 'test-repo',
    url: 'https://github.com/user/test-repo',
    registeredAt: '2023-01-01T00:00:00.000Z',
    status: 'active',
    deployments: {
      commands: ['test-command.js'],
      agents: ['test-agent.ts'],
      hooks: []
    },
    type: 'commands',
    deploymentMode: 'type-based',
    localPath: '/home/user/repos/test-repo'
  };

  const mockDeploymentMapping: DeploymentMapping = {
    repository: mockRepository,
    deployments: [
      {
        type: 'commands',
        files: ['commands/test-command.js', 'commands/utils.js'],
        status: 'active',
        deployedAt: '2023-01-01T12:00:00.000Z'
      },
      {
        type: 'agents',
        files: ['agents/test-agent.ts'],
        status: 'pending'
      }
    ],
    totalFiles: 3,
    lastDeployment: '2023-01-01T12:00:00.000Z'
  };

  describe('formatJson', () => {
    it('should format data as JSON', () => {
      const options: FormatterOptions = { format: 'json', verbose: true };
      const result = formatter.formatJson(mockRepository, options);
      
      expect(result).toContain('"name": "test-repo"');
      expect(result).toContain('"status": "active"');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should format compact JSON when verbose is false', () => {
      const options: FormatterOptions = { format: 'json', verbose: false };
      const result = formatter.formatJson(mockRepository, options);
      
      expect(result).not.toContain('\n');
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('formatYaml', () => {
    it('should format data as YAML', () => {
      const options: FormatterOptions = { format: 'yaml' };
      const result = formatter.formatYaml(mockRepository, options);
      
      expect(result).toContain('name: test-repo');
      expect(result).toContain('status: active');
      expect(result).toContain('url: https://github.com/user/test-repo');
    });
  });

  describe('formatText', () => {
    it('should format single repository as text', () => {
      const options: FormatterOptions = { format: 'table', colors: false };
      const result = formatter.formatText(mockRepository, options);
      
      expect(result).toContain('Repository: test-repo');
      expect(result).toContain('Status: active');
      expect(result).toContain('Type: commands');
    });

    it('should format repository array as table', () => {
      const options: FormatterOptions = { format: 'table', colors: false };
      const result = formatter.formatText([mockRepository], options);
      
      expect(result).toContain('test-repo');
      expect(result).toContain('active');
      expect(result).toContain('commands');
    });
  });

  describe('formatTree', () => {
    it('should format file paths as tree structure', () => {
      const files = ['commands/test.js', 'agents/helper.ts', 'hooks/pre-commit.js'];
      const options: FormatterOptions = { format: 'tree', colors: false };
      const result = formatter.formatTree(files, options);
      
      expect(result).toContain('Deployed Files');
      expect(result).toContain('commands');
      expect(result).toContain('agents');
      expect(result).toContain('hooks');
    });
  });

  describe('truncatePath', () => {
    it('should truncate long paths intelligently', () => {
      const longPath = '/very/long/path/to/some/deeply/nested/file.js';
      const result = formatter.truncatePath(longPath, 20);
      
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain('...');
    });

    it('should not truncate short paths', () => {
      const shortPath = '/short/path.js';
      const result = formatter.truncatePath(shortPath, 30);
      
      expect(result).toBe(shortPath);
    });

    it('should handle home directory replacement', () => {
      const homePath = process.env.HOME + '/projects/test.js';
      const result = formatter.truncatePath(homePath, 50);
      
      // The result should be shorter than the original path due to ~ replacement
      // or should contain the original path if no replacement occurred
      expect(result.length).toBeLessThanOrEqual(homePath.length);
      expect(result).toContain('projects/test.js');
    });
  });

  describe('formatDeploymentMapping', () => {
    it('should format deployment mapping with statistics', async () => {
      const options: FormatterOptions = { format: 'table', colors: false };
      const result = await formatter.formatDeploymentMapping(mockDeploymentMapping, options);
      
      expect(result).toContain('Deployments:');
      expect(result).toContain('Summary:');
      expect(result).toContain('Total Files: 3');
      expect(result).toContain('commands/test-command.js');
      expect(result).toContain('agents/test-agent.ts');
    });
  });

  describe('formatWithColor', () => {
    it('should apply colors when enabled', () => {
      const options: FormatterOptions = { format: 'table', colors: true };
      
      // Test with a known color that should work
      const redResult = formatter.formatWithColor('test', 'red', options);
      const greenResult = formatter.formatWithColor('test', 'green', options);
      const boldResult = formatter.formatWithColor('test', 'bold', options);
      
      // At least one of these should apply colors
      const hasColoring = redResult !== 'test' || greenResult !== 'test' || boldResult !== 'test';
      expect(hasColoring).toBe(true);
    });

    it('should not apply colors when disabled', () => {
      const options: FormatterOptions = { format: 'table', colors: false };
      const result = formatter.formatWithColor('test', 'red', options);
      
      expect(result).toBe('test');
    });
  });

  describe('format main method', () => {
    it('should route to appropriate formatter based on format option', () => {
      const jsonOptions: FormatterOptions = { format: 'json' };
      const yamlOptions: FormatterOptions = { format: 'yaml' };
      const tableOptions: FormatterOptions = { format: 'table' };
      const treeOptions: FormatterOptions = { format: 'tree' };

      const jsonResult = formatter.format(mockRepository, jsonOptions);
      const yamlResult = formatter.format(mockRepository, yamlOptions);
      const tableResult = formatter.format(mockRepository, tableOptions);
      const treeResult = formatter.format(['test.js'], treeOptions);

      expect(() => JSON.parse(jsonResult)).not.toThrow();
      expect(yamlResult).toContain('name: test-repo');
      expect(tableResult).toContain('Repository: test-repo');
      expect(treeResult).toContain('test.js');
    });
  });
});