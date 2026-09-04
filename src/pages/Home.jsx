import { useState } from 'react';
import HeroArrival from '@/components/home/HeroArrival';
import DeploymentPipeline from '@/components/home/DeploymentPipeline';
import TelemetrySidebar from '@/components/home/TelemetrySidebar';
import { useToast } from '@/components/ui/use-toast';

const release = {
  version: 'v2.4.1',
  commit: 'a3f9c2e',
  builtAgo: '3m ago',
  uptime: '99.98%',
  region: 'us-east-1',
};

export default function Home() {
  const [env, setEnv] = useState('production');
  const { toast } = useToast();

  const onPublish = () =>
    toast({
      title: 'Publishing to Base44',
      description: `Building ${release.version} for ${env}…`,
    });

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:py-10 lg:pb-12">
      <HeroArrival env={env} onEnvChange={setEnv} onPublish={onPublish} />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-[1fr_360px]">
        <DeploymentPipeline release={release} env={env} />
        <TelemetrySidebar />
      </div>
    </div>
  );
}