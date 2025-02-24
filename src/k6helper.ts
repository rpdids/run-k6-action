// Common helper functions used in the action
import * as core from '@actions/core';
import { spawn } from 'child_process';

    /**
     * Validates the test paths by running `k6 inspect --execution-requirements` on each test file.
     * A test path is considered valid if the command returns an exit code of 0.
     *
     * @export
     * @param {string[]} testPaths - List of test paths to validate
     * @return {Promise<string[]>} - List of valid test paths
     */
export async function validateTestPaths(testPaths: string[], flags: string[]): Promise<string[]> {

    if (testPaths.length === 0) {
        throw new Error('No test files found')
    }

    console.log(`🔍 Validating test run files.`);

    const validK6TestPaths: string[] = [],
        command = "k6",
        defaultArgs = ["inspect", "--execution-requirements", ...flags];

    const allPromises = [] as any[];

    testPaths.forEach(async testPath => {
        const args = [...defaultArgs, testPath];

        const child = spawn(command, args, {
            stdio: ['inherit', 'ignore', 'inherit'], // 'ignore' is for stdout
            detached: false,
        });

        allPromises.push(new Promise<void>(resolve => {
            child.on('exit', (code: number, signal: string) => {
                if (code === 0) {
                    validK6TestPaths.push(testPath);
                }
                resolve();
            });
        }));
    });

    await Promise.all(allPromises);

    return validK6TestPaths;
}

    /**
     * Cleans the script path by removing the base directory prefix if it is present.
     *
     * @export
     * @param {string} scriptPath - The script path to clean
     * @return {string} - Cleaned script path
     *
     * */
export function cleanScriptPath(scriptPath: string): string {

    const baseDir = process.env['GITHUB_WORKSPACE'] || '';
    const cleanedScriptPath = scriptPath.replace(baseDir, '');

    return cleanedScriptPath.trim();

}

/**
 * Checks if the cloud integration is enabled by checking if the K6_CLOUD_TOKEN and K6_CLOUD_PROJECT_ID are set.
 *
 * @export
 * @return {boolean} - True if the cloud integration is enabled, false otherwise
 */
export function isCloudIntegrationEnabled(): boolean {
    if (process.env.K6_CLOUD_TOKEN === undefined || process.env.K6_CLOUD_TOKEN === '') {
        return false
    }

    if (process.env.K6_CLOUD_PROJECT_ID === undefined || process.env.K6_CLOUD_PROJECT_ID === '') {
        throw new Error('K6_CLOUD_PROJECT_ID must be set when K6_CLOUD_TOKEN is set')
    }

    return true
}

/**
 * Generates a command for running k6 tests.
 *
 * @param path - The path to the test file.
 * @param flags - The flags to pass to k6.
 * @param isCloud - Whether the test is running in the cloud.
 * @param cloudRunLocally - Whether to run the test locally and upload results to cloud.
 *
 * @returns The generated command.
 */
export function generateK6RunCommand(path: string, flags: string, isCloud: boolean, cloudRunLocally: boolean): string {
    let command;
    const args = [
        `--address=`,
        ...(flags ? flags.split(' ') : []),
    ]

    if (isCloud) {
        // Cloud execution is possible for the test
        if (cloudRunLocally) {
            // Execute tests locally and upload results to cloud
            command = "k6 run"
            args.push(`--out=cloud`)
        } else {
            // Execute tests in cloud
            command = "k6 cloud"
        }
    } else {
        // Local execution
        command = "k6 run"
    }

    // Add path the arguments list
    args.push(path)

    // Append arguments to the command
    command = `${command} ${args.join(' ')}`

    core.debug("🤖 Generated command: " + command);
    return command;
}