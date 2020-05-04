jest.mock('@dojot/dojot-module');
jest.mock('@dojot/dojot-module-logger');
jest.mock('../../app/utils/utils');
jest.mock('../../app/MqttClient.js');

const mockProcess = require('jest-mock-process');
const utils = require('../../app/utils/utils');
const AgentMessenger = require('../../app/AgentMessenger');

const mockExit = mockProcess.mockProcessExit();

/* MOCKS */
const mockConfig = {
  Messenger: {
    updateAttrs: jest.fn(),
    init: jest.fn(),
    on: jest.fn((arg0, arg1, callback) => callback('tenant', 'device')),
  },

  kafkaConfig: {
    test: 'testmock',
    messenger: {
      kafka: {
        dojot: {
          subjects: {
            verne: 'verne',
          },
        },
      },
    },
    mqtt: {
      subscribeTopic: 'topic',
    },
    app: {
      logLevel: 'debug',
    },
  },

  mqttConfig: {
    client: 'test',
    subscribe: jest.fn(),
  },

};

jest.mock('@dojot/iotagent-nodejs', () => ({
  IoTAgent: jest.fn(() => mockConfig.Messenger),
}));

let mockedMessenger;

async function expectConfigs() {
  mockConfig.Messenger.init.mockReturnValue(Promise.resolve());

  await mockedMessenger.init();

  expect(mockConfig.Messenger.init).toHaveBeenCalled();
  expect(mockedMessenger.mqttClient.init).toHaveBeenCalled();
}

describe('Testing AgentMessenger messenger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it('Should init correctly the agent messenger with config and publish data', () => {
    mockedMessenger = new AgentMessenger(mockConfig.kafkaConfig);
    expectConfigs();
  });

  it('Should init correctly the agent messenger without config', () => {
    mockedMessenger = new AgentMessenger();

    expectConfigs();
  });

  it('Should not init correctly the agent messenger', async () => {
    const reason = 'error';
    mockedMessenger = new AgentMessenger(mockConfig.kafkaConfig);
    mockConfig.Messenger.init.mockReturnValue(Promise.reject(reason));

    try {
      await mockedMessenger.init();
    } catch (error) {
      expect(error).toEqual(reason);
    }
  });

  it('Should send message after onMessage', () => {
    mockedMessenger = new AgentMessenger(mockConfig.kafkaConfig);
    expectConfigs();

    const generateDataFake = {
      metadata: {
        tenant: 'fake',
        deviceid: 'fake',
      },
    };
    utils.generateDojotDeviceDataMessage = jest.fn().mockReturnValue(generateDataFake);

    const fakeMessage = '{ "name":"John", "age":30, "city":"New York"}';
    mockedMessenger.sendMessage('test', fakeMessage);
    expect(mockConfig.Messenger.updateAttrs).toHaveBeenCalled();
  });


  it('Should not send message after onMessage', () => {
    mockedMessenger = new AgentMessenger(mockConfig.kafkaConfig);
    expectConfigs();

    const generateDataFake = {
      metadata: {
        tenant: 'fake',
        deviceid: 'fake',
      },
    };
    utils.generateDojotDeviceDataMessage = jest.fn().mockReturnValue(generateDataFake);
    const fakeMessage = 'error format';

    try {
      mockedMessenger.sendMessage('test', fakeMessage);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});