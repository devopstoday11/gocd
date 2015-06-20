package com.thoughtworks.go.config;

import com.thoughtworks.go.config.remote.PartialConfig;
import com.thoughtworks.go.metrics.service.MetricsProbeService;
import com.thoughtworks.go.server.util.ServerVersion;
import com.thoughtworks.go.serverhealth.ServerHealthService;
import com.thoughtworks.go.service.ConfigRepository;
import com.thoughtworks.go.util.ConfigElementImplementationRegistryMother;
import com.thoughtworks.go.util.GoConfigFileHelper;
import com.thoughtworks.go.util.SystemEnvironment;
import com.thoughtworks.go.util.TimeProvider;
import org.junit.Before;

import static com.thoughtworks.go.helper.ConfigFileFixture.CONFIG;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Created by tomzo on 6/20/15.
 */
public class CachedFileGoConfigTest extends CachedGoConfigBaseTest {
    @Before
    public void setUp() throws Exception {
        configHelper = new GoConfigFileHelper(CONFIG);
        SystemEnvironment env = new SystemEnvironment();
        ConfigRepository configRepository = new ConfigRepository(env);
        configRepository.initialize();
        dataSource = new GoFileConfigDataSource(new DoNotUpgrade(), configRepository, env, new TimeProvider(),
                new ConfigCache(), new ServerVersion(), ConfigElementImplementationRegistryMother.withNoPlugins(),
                metricsProbeService, serverHealthService);
        serverHealthService = new ServerHealthService();
        CachedFileGoConfig cachedFileGoConfig = new CachedFileGoConfig(dataSource, serverHealthService);
        cachedGoConfig = cachedFileGoConfig;
        cachedGoConfig.loadConfigIfNull();
        configHelper.usingCruiseConfigDao(new GoConfigDao(cachedFileGoConfig, mock(MetricsProbeService.class)));
    }
}
