import {
  checkFilesExist,
  cleanupProject,
  getPackageManagerCommand,
  getSelectedPackageManager,
  killPorts,
  newProject,
  promisifiedTreeKill,
  runCLI,
  runCommand,
  runCommandUntil,
  tmpProjPath,
  uniq,
  updateFile,
  updateJson,
} from '@nx/e2e/utils';
import { execSync } from 'child_process';
import * as http from 'http';

let originalEnvPort;

describe('Node Applications', () => {
  const pm = getSelectedPackageManager();

  beforeAll(() => {
    originalEnvPort = process.env.PORT;
    newProject({
      packages: ['@nx/node', '@nx/express', '@nx/nest', '@nx/webpack'],
      preset: 'ts',
    });
  });

  afterAll(() => {
    process.env.PORT = originalEnvPort;
    cleanupProject();
  });

  it('should be able to generate an empty application', async () => {
    const nodeapp = uniq('nodeapp');
    const port = getRandomPort();
    process.env.PORT = `${port}`;
    runCLI(
      `generate @nx/node:app apps/${nodeapp} --port=${port} --linter=eslint --unitTestRunner=jest`
    );

    expect(() => runCLI(`lint ${nodeapp}`)).not.toThrow();
    expect(() => runCLI(`test ${nodeapp}`)).not.toThrow();

    updateFile(`apps/${nodeapp}/src/main.ts`, `console.log('Hello World!');`);
    runCLI(`build ${nodeapp}`);

    checkFilesExist(`dist/apps/${nodeapp}/main.js`);
    const result = execSync(`node dist/apps/${nodeapp}/main.js`, {
      cwd: tmpProjPath(),
    }).toString();
    expect(result).toContain('Hello World!');
    await killPorts(port);
  }, 300_000);

  it('should be able to generate an express application', async () => {
    const nodeapp = uniq('nodeapp');
    const nodelib = uniq('nodelib');
    const port = getRandomPort();
    process.env.PORT = `${port}`;
    runCLI(
      `generate @nx/express:app apps/${nodeapp} --port=${port} --linter=eslint --unitTestRunner=jest`
    );
    runCLI(
      `generate @nx/node:lib packages/${nodelib} --linter=eslint --unitTestRunner=jest`
    );

    // No tests are generated by default, add a stub one.
    updateFile(
      `apps/${nodeapp}/src/app/test.spec.ts`,
      `
          describe('test', () => {
            it('should work', () => {
              expect(true).toEqual(true);
            })
          })
        `
    );

    updateFile(`apps/${nodeapp}/src/assets/file.txt`, `Test`);
    updateFile(`apps/${nodeapp}/src/main.ts`, (content) => {
      return `import { ${nodelib} } from '@proj/${nodelib}';\n${content}\nconsole.log(${nodelib}());`;
    });
    // pnpm does not link packages unless they are deps
    // npm, yarn, and bun will link them in the root node_modules regardless
    if (pm === 'pnpm') {
      updateJson(`apps/${nodeapp}/package.json`, (json) => {
        json.dependencies = {
          [`@proj/${nodelib}`]: 'workspace:',
        };
        return json;
      });
      runCommand(getPackageManagerCommand().install);
    }
    runCLI(`sync`);

    expect(() => runCLI(`lint ${nodeapp}`)).not.toThrow();
    expect(() => runCLI(`test ${nodeapp}`)).not.toThrow();
    expect(() => runCLI(`build ${nodeapp}`)).not.toThrow();
    expect(() => runCLI(`typecheck ${nodeapp}`)).not.toThrow();
    expect(() => runCLI(`lint ${nodelib}`)).not.toThrow();
    expect(() => runCLI(`test ${nodelib}`)).not.toThrow();
    expect(() => runCLI(`build ${nodelib}`)).not.toThrow();
    expect(() => runCLI(`typecheck ${nodelib}`)).not.toThrow();

    const p = await runCommandUntil(
      `serve ${nodeapp}`,
      (output) => output.includes(`Listening at http://localhost:${port}`),

      {
        env: {
          NX_DAEMON: 'true',
        },
      }
    );

    let result = await getData(port);
    expect(result.message).toMatch(`Welcome to ${nodeapp}!`);

    result = await getData(port, '/assets/file.txt');
    expect(result).toMatch(`Test`);

    try {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
      expect(await killPorts(port)).toBeTruthy();
    } catch (err) {
      expect(err).toBeFalsy();
    }
  }, 300_000);
});

function getRandomPort() {
  return Math.floor(1000 + Math.random() * 9000);
}

function getData(port, path = '/api'): Promise<any> {
  return new Promise((resolve) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      expect(res.statusCode).toEqual(200);
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.once('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
  });
}
