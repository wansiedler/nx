group = "dev.nx.gradle"

/*
 * This file was generated by the Gradle "init" task.
 *
 * This generated file contains a sample Gradle plugin project to get you started.
 * For more details on writing Custom Plugins, please refer to https://docs.gradle.org/8.5/userguide/custom_plugins.html in the Gradle documentation.
 * This project uses @Incubating APIs which are subject to change.
 */

plugins {
    // Apply the Java Gradle plugin development plugin to add support for developing Gradle plugins
    `java-gradle-plugin`
    `maven-publish`
    id("com.gradle.plugin-publish") version "1.3.0"

    id("java-library")
    kotlin("jvm") version "2.1.10"
}

repositories {
    // Use Maven Central for resolving dependencies.
    mavenCentral()
}

gradlePlugin {
    website = "https://nx.dev/" 
    vcsUrl = "https://github.com/nrwl/nx" 
    // Define the plugin
    plugins {
        create("nxGradleNodesPlugin") {
            id = "dev.nx.gradle.native"
            implementationClass = "dev.nx.gradle.native.NodesPlugin"
            displayName = "The Nx Plugin for Gradle to generate nodes, dependencies and external nodes"
            description = "A plugin to generate a json file with nodes, dependencies and external nodes for Nx"
            tags = listOf("nx", "monorepo", "javascript", "typescript")
        }
    }
}
 
publishing {
    publications {
        create<MavenPublication>("maven") {
            groupId = "dev.nx.gradle"
            artifactId = "native"
            version = "0.0.1-alpha.2"
        }
    }
}

dependencies {
    implementation("com.google.code.gson:gson:2.11.0")

    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}
