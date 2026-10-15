using System;
using System.Diagnostics;
using System.IO;
using System.Text;

// Windows subsystem: opening the Spotify shortcut never creates a terminal.
internal static class IzifyLauncher
{
    private static string Quote(string value)
    {
        var result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char character in value)
        {
            if (character == '\\') { slashes++; continue; }
            if (character == '"') { result.Append('\\', slashes * 2 + 1); result.Append(character); }
            else { result.Append('\\', slashes); result.Append(character); }
            slashes = 0;
        }
        result.Append('\\', slashes * 2); result.Append('"');
        return result.ToString();
    }

    [STAThread]
    private static int Main(string[] args)
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        try
        {
            bool monitor = args.Length == 1 && args[0] == "--monitor";
            string script = Path.Combine(root, monitor ? "run.ps1" : "launch.ps1");
            var arguments = new StringBuilder("-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ");
            arguments.Append(Quote(script));
            if (monitor) arguments.Append(" -Monitor");
            else foreach (string argument in args) { arguments.Append(' '); arguments.Append(Quote(argument)); }
            Process child = Process.Start(new ProcessStartInfo {
                FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell\\v1.0\\powershell.exe"),
                Arguments = arguments.ToString(), WorkingDirectory = root,
                UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden
            });
            if (!monitor && child != null)
            {
                child.WaitForExit();
                if (child.ExitCode != 0)
                {
                    // An error console is explicitly requested; do not retry Spotify.
                    Process.Start(new ProcessStartInfo {
                        FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell\\v1.0\\powershell.exe"),
                        Arguments = "-NoProfile -ExecutionPolicy Bypass -NoExit -File " + Quote(script) + " -ShowError",
                        WorkingDirectory = root, UseShellExecute = false,
                        CreateNoWindow = false, WindowStyle = ProcessWindowStyle.Normal
                    });
                    return child.ExitCode;
                }
            }
            return 0;
        }
        catch (Exception error)
        {
            File.AppendAllText(Path.Combine(root, "auto-start.log"), DateTime.UtcNow.ToString("s") + " " + error.Message + Environment.NewLine);
            return 1;
        }
    }
}
