require 'json'

pin = JSON.parse(File.read(File.join(__dir__, 'source.json')))

Pod::Spec.new do |s|
  s.name = 'PulsarHaptics'
  s.version = pin['iosVersion']
  s.summary = 'Pulsar native core with authored audio and preset bundles.'
  s.homepage = 'https://github.com/software-mansion/pulsar'
  s.license = { :type => 'MIT', :file => 'LICENSE' }
  s.author = 'Software Mansion'
  s.source = {
    :http => "#{pin['archiveBaseUrl']}/tar.gz/#{pin['revision']}",
    :type => :tgz,
    :flatten => true,
    :sha256 => pin['sha256']
  }
  s.platform = :ios, '13.0'
  s.swift_version = '5.9'
  s.source_files = 'iOS/Pulsar/Sources/Pulsar/**/*.swift'
  s.frameworks = 'AVFoundation', 'CoreHaptics', 'UIKit'
  s.requires_arc = true
end
