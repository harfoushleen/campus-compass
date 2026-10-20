#!/usr/bin/perl
# Tiny local web server for the Campus Compass app (macOS).
# Uses only Perl, which ships with macOS: nothing to install. It only listens on this computer (127.0.0.1).
# start.command runs this.   Usage: perl server.pl [app-folder]
use strict;
use warnings;
use IO::Socket::INET;
use Cwd qw(abs_path);

$| = 1;
my $root = abs_path($ARGV[0] // 'app');
die "Could not find the app folder. Make sure you unzipped the whole campus-app folder.\n"
    unless defined $root && -f "$root/index.html";

# File type for each extension. Browsers refuse some files (for example .wasm) with the wrong type.
my %mime = (
    html => 'text/html; charset=utf-8',  htm => 'text/html; charset=utf-8',
    js   => 'text/javascript; charset=utf-8', mjs => 'text/javascript; charset=utf-8',
    css  => 'text/css; charset=utf-8',
    json => 'application/json; charset=utf-8', map => 'application/json; charset=utf-8',
    wasm => 'application/wasm',
    glb  => 'model/gltf-binary', gltf => 'model/gltf+json',
    svg  => 'image/svg+xml', png => 'image/png', jpg => 'image/jpeg', jpeg => 'image/jpeg',
    gif  => 'image/gif', webp => 'image/webp', ico => 'image/x-icon',
    webmanifest => 'application/manifest+json',
    txt  => 'text/plain; charset=utf-8', woff => 'font/woff', woff2 => 'font/woff2',
);

# Look for a free port, starting at 8765 (port 0 = let the system pick one).
my $server;
for my $try (8765 .. 8815, 0) {
    $server = IO::Socket::INET->new(
        Listen => 20, LocalAddr => '127.0.0.1', LocalPort => $try, Proto => 'tcp', ReuseAddr => 1,
    ) and last;
}
die "Could not start the local server: $!\n" unless $server;
my $port = $server->sockport;
my $url  = "http://127.0.0.1:$port/";

print "\n  Campus Compass is running.\n  Address: $url\n\n";
print "  Keep this window open while you use the app.\n  Close this window to stop it.\n\n";
system('open', $url) unless $ENV{CAMPUS_NO_BROWSER};

$SIG{CHLD} = 'IGNORE';   # don't leave finished helper processes behind
$SIG{PIPE} = 'IGNORE';   # a browser that hangs up is not an error
while (my $client = $server->accept) {
    my $pid = fork();
    if (defined $pid && $pid == 0) {   # helper process: answer this one request
        close $server;
        handle($client);
        close $client;
        exit 0;
    }
    handle($client) unless defined $pid;   # could not fork: answer here instead
    close $client;
}

sub handle {
    my ($c) = @_;
    $c->autoflush(1);
    binmode $c;
    my $line = <$c>;
    return unless defined $line;
    my ($method, $target) = $line =~ m{^(\w+)\s+(\S+)};
    while (my $h = <$c>) { last if $h =~ /^\r?\n$/ }   # skip the request headers
    return reply($c, 400, 'Bad request') unless defined $method && defined $target;
    return reply($c, 405, 'Method not allowed') unless $method eq 'GET' || $method eq 'HEAD';

    my ($path) = $target =~ m{^([^?#]*)};
    $path =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/eg;
    $path = '/index.html' if $path eq '/';
    # Never serve anything outside the app folder.
    return reply($c, 403, 'Forbidden') if $path =~ m{(^|/)\.\.(/|$)} || $path =~ /\0/;

    my $file = "$root$path";
    unless (-f $file) {
        return reply($c, 404, 'Not found', $method) if $path =~ m{\.[A-Za-z0-9]+$};
        $file = "$root/index.html";   # any other address opens the app
    }
    my ($ext) = $file =~ m{\.([A-Za-z0-9]+)$};
    my $type = $mime{ lc($ext // '') } // 'application/octet-stream';
    open(my $fh, '<:raw', $file) or return reply($c, 500, 'Cannot read file');
    my $body = do { local $/; <$fh> };
    close $fh;
    print $c "HTTP/1.1 200 OK\r\nContent-Type: $type\r\nContent-Length: " . length($body)
        . "\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";   # no-store: never an old cached version
    print $c $body unless $method eq 'HEAD';
}

sub reply {
    my ($c, $code, $text) = @_;
    print $c "HTTP/1.1 $code $text\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: " . length($text)
        . "\r\nConnection: close\r\n\r\n$text";
}
