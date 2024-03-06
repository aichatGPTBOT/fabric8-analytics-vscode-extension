'use strict';

import * as vscode from 'vscode';

import { GlobalState, DEFAULT_RHDA_REPORT_FILE_PATH, SNYK_TOKEN_KEY } from './constants';
import * as commands from './commands';
import { getTelemetryId } from './redhatTelemetry';

/**
 * Represents the configuration settings for the extension.
 */
class Config {
  telemetryId: string;
  stackAnalysisCommand: string;
  rhRepositoryRecommendationNotificationCommand: string;
  utmSource: string;
  matchManifestVersions: string;
  vulnerabilityAlertSeverity: string;
  exhortMvnPath: string;
  exhortNpmPath: string;
  exhortGoPath: string;
  exhortPython3Path: string;
  exhortPip3Path: string;
  exhortPythonPath: string;
  exhortPipPath: string;
  rhdaReportFilePath: string;
  secrets: vscode.SecretStorage;

  private readonly DEFAULT_MVN_EXECUTABLE = 'mvn';
  private readonly DEFAULT_NPM_EXECUTABLE = 'npm';
  private readonly DEFAULT_GO_EXECUTABLE = 'go';
  private readonly DEFAULT_PYTHON3_EXECUTABLE = 'python3';
  private readonly DEFAULT_PIP3_EXECUTABLE = 'pip3';
  private readonly DEFAULT_PYTHON_EXECUTABLE = 'python';
  private readonly DEFAULT_PIP_EXECUTABLE = 'pip';

  /**
   * Creates an instance of the Config class.
   * Initializes the instance with default extension settings.
   */
  constructor() {
    this.loadData();
  }

  /**
   * Retrieves RHDA configuration settings.
   * @returns The RHDA configuration settings.
   * @private
   */
  private getRhdaConfig(): any {
    return vscode.workspace.getConfiguration('redHatDependencyAnalytics');
  }

  /**
   * Loads configuration settings.
   */
  loadData() {
    const rhdaConfig = this.getRhdaConfig();

    this.stackAnalysisCommand = commands.STACK_ANALYSIS_COMMAND;
    this.rhRepositoryRecommendationNotificationCommand = commands.REDHAT_REPOSITORY_RECOMMENDATION_NOTIFICATION_COMMAND;
    this.utmSource = GlobalState.UTM_SOURCE;
    /* istanbul ignore next */
    this.matchManifestVersions = rhdaConfig.matchManifestVersions ? 'true' : 'false';
    this.vulnerabilityAlertSeverity = rhdaConfig.vulnerabilityAlertSeverity;
    /* istanbul ignore next */
    this.rhdaReportFilePath = rhdaConfig.reportFilePath || DEFAULT_RHDA_REPORT_FILE_PATH;
    this.exhortMvnPath = rhdaConfig.mvn.executable.path || this.DEFAULT_MVN_EXECUTABLE;
    this.exhortNpmPath = rhdaConfig.npm.executable.path || this.DEFAULT_NPM_EXECUTABLE;
    this.exhortGoPath = rhdaConfig.go.executable.path || this.DEFAULT_GO_EXECUTABLE;
    this.exhortPython3Path = rhdaConfig.python3.executable.path || this.DEFAULT_PYTHON3_EXECUTABLE;
    this.exhortPip3Path = rhdaConfig.pip3.executable.path || this.DEFAULT_PIP3_EXECUTABLE;
    this.exhortPythonPath = rhdaConfig.python.executable.path || this.DEFAULT_PYTHON_EXECUTABLE;
    this.exhortPipPath = rhdaConfig.pip.executable.path || this.DEFAULT_PIP_EXECUTABLE;
  }

  /**
   * Sets process environment variables based on configuration settings.
   * @private
   */
  private async setProcessEnv(): Promise<void> {
    process.env['VSCEXT_STACK_ANALYSIS_COMMAND'] = this.stackAnalysisCommand;
    process.env['VSCEXT_REDHAT_REPOSITORY_RECOMMENDATION_NOTIFICATION_COMMAND'] = this.rhRepositoryRecommendationNotificationCommand;
    process.env['VSCEXT_UTM_SOURCE'] = this.utmSource;
    process.env['VSCEXT_MATCH_MANIFEST_VERSIONS'] = this.matchManifestVersions;
    process.env['VSCEXT_VULNERABILITY_ALERT_SEVERITY'] = this.vulnerabilityAlertSeverity;
    process.env['VSCEXT_EXHORT_MVN_PATH'] = this.exhortMvnPath;
    process.env['VSCEXT_EXHORT_NPM_PATH'] = this.exhortNpmPath;
    process.env['VSCEXT_EXHORT_GO_PATH'] = this.exhortGoPath;
    process.env['VSCEXT_EXHORT_PYTHON3_PATH'] = this.exhortPython3Path;
    process.env['VSCEXT_EXHORT_PIP3_PATH'] = this.exhortPip3Path;
    process.env['VSCEXT_EXHORT_PYTHON_PATH'] = this.exhortPythonPath;
    process.env['VSCEXT_EXHORT_PIP_PATH'] = this.exhortPipPath;
    process.env['VSCEXT_TELEMETRY_ID'] = this.telemetryId;

    const token = await this.getSnykToken();
    process.env['VSCEXT_EXHORT_SNYK_TOKEN'] = token;
  }

  /**
   * Authorizes the RHDA (Red Hat Dependency Analytics) service.
   * @param context The extension context for authorization.
   */
  async authorizeRHDA(context): Promise<void> {
    this.telemetryId = await getTelemetryId(context);
    await this.setProcessEnv();
  }

  /**
   * Links the secret storage to the configuration object.
   * @param context The extension context.
   */
  linkToSecretStorage(context) {
    this.secrets = context.secrets;
  }

  /**
   * Sets the Snyk token.
   * @param token The Snyk token.
   * @returns A Promise that resolves when the token is set.
   */
  async setSnykToken(token: string | undefined): Promise<void> {
    if (!token) { return; }

    try {
      await this.secrets.store(SNYK_TOKEN_KEY, token);
      vscode.window.showInformationMessage('Snyk token has been saved successfully');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save Snyk token to VSCode Secret Storage, Error: ${error.message}`);
    }
  }

  /**
   * Gets the Snyk token.
   * @returns A Promise that resolves with the Snyk token.
   */
  async getSnykToken(): Promise<string> {
    try {
      const token = await this.secrets.get(SNYK_TOKEN_KEY);
      return token || '';
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get Snyk token from VSCode Secret Storage, Error: ${error.message}`);
      await this.clearSnykToken(false);
      return '';
    }
  }

  /**
   * Clears the Snyk token.
   * @returns A Promise that resolves when the token is cleared.
   */
  async clearSnykToken(notify: boolean): Promise<void> {
    try {
      await this.secrets.delete(SNYK_TOKEN_KEY);
      if (notify) {
        vscode.window.showInformationMessage('Snyk token has been removed successfully');
      }
    } catch (error) {
      const errorMsg = `Failed to delete Snyk token from VSCode Secret Storage, Error: ${error.message}`;
      if (notify) {
        vscode.window.showErrorMessage(errorMsg);
      } else {
        console.error(errorMsg);
      }

    }
  }
}

/**
 * The global configuration object for the extension.
 */
const globalConfig = new Config();

export { globalConfig };

