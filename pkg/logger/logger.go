package logger

import (
	"fmt"
	"os"
	"time"
)

// Logger provides structured logging with JSON or text output.
type Logger struct {
	level  string
	format string
}

// New creates a new logger instance.
func New(level, format string) (*Logger, error) {
	return &Logger{
		level:  level,
		format: format,
	}, nil
}

// Sync flushes any buffered log entries.
func (l *Logger) Sync() {}

func (l *Logger) log(level string, msg string, kvs ...interface{}) {
	ts := time.Now().Format(time.RFC3339)
	if l.format == "json" {
		fmt.Fprintf(os.Stdout, `{"time":"%s","level":"%s","msg":"%s"`, ts, level, msg)
		for i := 0; i+1 < len(kvs); i += 2 {
			fmt.Fprintf(os.Stdout, `,"%v":"%v"`, kvs[i], kvs[i+1])
		}
		fmt.Fprintln(os.Stdout, "}")
	} else {
		fmt.Fprintf(os.Stdout, "%s [%s] %s", ts, level, msg)
		for i := 0; i+1 < len(kvs); i += 2 {
			fmt.Fprintf(os.Stdout, " %v=%v", kvs[i], kvs[i+1])
		}
		fmt.Fprintln(os.Stdout)
	}
}

// Info logs an informational message.
func (l *Logger) Info(msg string, kvs ...interface{}) {
	l.log("INFO", msg, kvs...)
}

// Error logs an error message.
func (l *Logger) Error(msg string, kvs ...interface{}) {
	l.log("ERROR", msg, kvs...)
}

// Warn logs a warning message.
func (l *Logger) Warn(msg string, kvs ...interface{}) {
	l.log("WARN", msg, kvs...)
}

// Debug logs a debug message (only when level is "debug").
func (l *Logger) Debug(msg string, kvs ...interface{}) {
	if l.level == "debug" {
		l.log("DEBUG", msg, kvs...)
	}
}

// Fatal logs a fatal message and exits.
func (l *Logger) Fatal(msg string, kvs ...interface{}) {
	l.log("FATAL", msg, kvs...)
	os.Exit(1)
}
