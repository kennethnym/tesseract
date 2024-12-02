package service

import (
	"encoding/json"
	"io"
	"path/filepath"
)

type Config struct {
	Port                  int    `json:"port"`
	DatabasePath          string `json:"databasePath"`
	TemplateDirectoryPath string `json:"templateDirectoryPath"`
	HostKeyDirectoryPath  string `json:"hostKeyDirectoryPath"`
	HostName              string `json:"hostName"`
	Debug                 bool   `json:"debug"`
}

const defaultPort = 8080

func ReadConfigFrom(reader io.Reader) (Config, error) {
	var config Config
	err := json.NewDecoder(reader).Decode(&config)
	if err != nil {
		return Config{}, err
	}

	config.DatabasePath, err = filepath.Abs(config.DatabasePath)
	if err != nil {
		return Config{}, err
	}

	config.TemplateDirectoryPath, err = filepath.Abs(config.TemplateDirectoryPath)
	if err != nil {
		return Config{}, err
	}

	config.HostKeyDirectoryPath, err = filepath.Abs(config.HostKeyDirectoryPath)
	if err != nil {
		return Config{}, err
	}

	if config.Port == 0 {
		config.Port = defaultPort
	}

	return config, nil
}
